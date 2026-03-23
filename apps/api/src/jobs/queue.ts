import type { Job } from 'bullmq';
import { Queue, QueueEvents, Worker } from 'bullmq';

import { env } from '../config/env.js';

const redisUrl = (env.REDIS_URL ?? '').trim();
/** Sem `REDIS_URL`, a API sobe mas filas WhatsApp/lembretes não processam jobs (útil em dev local). */
export const isRedisEnabled = Boolean(redisUrl);

const redisConnection = redisUrl ? { url: redisUrl } : null;

const defaultJobOptions = {
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
};

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_DURATION_MS = 60 * 60 * 1000;

function getConnection(): { url: string } {
  if (!redisConnection) {
    throw new Error('Redis não configurado (defina REDIS_URL)');
  }
  return redisConnection;
}

let whatsappQueueInstance: Queue<WhatsAppJobData> | null = null;
let remindersQueueInstance: Queue<ReminderJobData> | null = null;

function getWhatsappQueue(): Queue<WhatsAppJobData> {
  whatsappQueueInstance ??= new Queue<WhatsAppJobData>('whatsapp', {
    connection: getConnection(),
    defaultJobOptions,
  });
  return whatsappQueueInstance;
}

function getRemindersQueue(): Queue<ReminderJobData> {
  remindersQueueInstance ??= new Queue<ReminderJobData>('reminders', {
    connection: getConnection(),
    defaultJobOptions,
  });
  return remindersQueueInstance;
}

export function getWhatsappQueueEvents(): QueueEvents | null {
  if (!isRedisEnabled) return null;
  return new QueueEvents('whatsapp', { connection: getConnection() });
}

export function createWhatsappWorker(
  processor: (job: Job<WhatsAppJobData>) => Promise<void>
): Worker<WhatsAppJobData> {
  return new Worker<WhatsAppJobData>('whatsapp', processor, {
    connection: getConnection(),
    concurrency: 1,
    limiter: { max: RATE_LIMIT_MAX, duration: RATE_LIMIT_DURATION_MS },
  });
}

export function createRemindersWorker(
  processor: (job: Job<ReminderJobData>) => Promise<void>
): Worker<ReminderJobData> {
  return new Worker<ReminderJobData>('reminders', processor, {
    connection: getConnection(),
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
  if (!isRedisEnabled) {
    if (env.NODE_ENV === 'development') {
      console.warn(
        '[queue] addWhatsAppJob ignorado: defina REDIS_URL ou suba Redis (ex.: docker compose up -d redis)'
      );
    }
    return;
  }
  await getWhatsappQueue().add('send', data, defaultJobOptions);
}

export type ReminderJobData = {
  appointmentId: string;
  userId: string;
  runAt: number;
};

export async function addReminderJob(data: ReminderJobData): Promise<void> {
  if (!isRedisEnabled) {
    if (env.NODE_ENV === 'development') {
      console.warn('[queue] addReminderJob ignorado: Redis indisponível');
    }
    return;
  }
  const delay = Math.max(0, data.runAt - Date.now());
  await getRemindersQueue().add('reminder', data, { ...defaultJobOptions, delay });
}
