import type { Job } from 'bullmq';
import { Queue, QueueEvents, Worker } from 'bullmq';

import { env } from '../config/env.js';

const connection = { url: env.REDIS_URL };

const defaultJobOptions = {
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
};

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_DURATION_MS = 60 * 60 * 1000;

export const whatsappQueue = new Queue('whatsapp', {
  connection,
  defaultJobOptions,
});

export const remindersQueue = new Queue('reminders', {
  connection,
  defaultJobOptions,
});

export function getWhatsappQueueEvents(): QueueEvents {
  return new QueueEvents('whatsapp', { connection });
}

export function createWhatsappWorker(
  processor: (job: Job<WhatsAppJobData>) => Promise<void>
): Worker<WhatsAppJobData> {
  const worker = new Worker<WhatsAppJobData>('whatsapp', processor, {
    connection,
    concurrency: 1,
    limiter: { max: RATE_LIMIT_MAX, duration: RATE_LIMIT_DURATION_MS },
  });
  return worker;
}

export function createRemindersWorker(
  processor: (job: Job<ReminderJobData>) => Promise<void>
): Worker<ReminderJobData> {
  return new Worker<ReminderJobData>('reminders', processor, {
    connection,
    concurrency: 5,
  });
}

export type WhatsAppJobData = {
  userId: string;
  instanceId: string;
  phone: string;
  message: string;
  type: 'reminder' | 'charge' | 'confirmation' | 'custom';
  mediaUrl?: string;
  caption?: string;
  clientId?: string;
  appointmentId?: string;
  chargeId?: string;
};

export async function addWhatsAppJob(data: WhatsAppJobData): Promise<void> {
  await whatsappQueue.add('send', data, defaultJobOptions);
}

export type ReminderJobData = {
  appointmentId: string;
  userId: string;
  runAt: number;
};

export async function addReminderJob(data: ReminderJobData): Promise<void> {
  const delay = Math.max(0, data.runAt - Date.now());
  await remindersQueue.add('reminder', data, { ...defaultJobOptions, delay });
}
