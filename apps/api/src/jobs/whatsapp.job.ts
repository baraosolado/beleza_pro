import type { Job } from 'bullmq';

import { prisma } from '../db/prisma/client.js';
import * as whatsapp from '../integrations/whatsapp/index.js';
import {
  createWhatsappWorker,
  isRedisEnabled,
  type WhatsAppJobData,
} from './queue.js';

const worker = isRedisEnabled
  ? createWhatsappWorker(async (job: Job<WhatsAppJobData>) => {
      const {
        userId,
        instanceId,
        phone,
        message,
        type,
        mediaUrl,
        caption,
        clientId,
        appointmentId,
        chargeId,
      } = job.data;

      if (!whatsapp.isConfigured()) {
        throw new Error('provider do WhatsApp não configurado');
      }

      try {
        if (mediaUrl) {
          await whatsapp.sendMedia({ instanceId, phone, mediaUrl, caption });
        } else {
          await whatsapp.sendText({ instanceId, phone, text: message });
        }

        await prisma.whatsAppMessage.create({
          data: {
            userId,
            clientId: clientId ?? undefined,
            appointmentId: appointmentId ?? undefined,
            chargeId: chargeId ?? undefined,
            phone,
            message,
            type,
            status: 'sent',
            sentAt: new Date(),
          },
        });
      } catch (err) {
        await prisma.whatsAppMessage.create({
          data: {
            userId,
            clientId: clientId ?? undefined,
            appointmentId: appointmentId ?? undefined,
            chargeId: chargeId ?? undefined,
            phone,
            message,
            type,
            status: 'failed',
          },
        });
        throw err;
      }
    })
  : null;

if (worker) {
  worker.on('failed', (job, err) => {
    console.error(`[whatsapp.job] job ${job?.id} failed:`, err?.message);
  });

  worker.on('error', (err) => {
    console.error('[whatsapp.job] worker error:', err);
  });
} else {
  console.warn(
    '[whatsapp.job] Worker não iniciado: REDIS_URL vazio — fila WhatsApp desativada em dev'
  );
}

export { worker as whatsappWorker };
