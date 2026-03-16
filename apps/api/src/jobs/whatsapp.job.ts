import type { Job } from 'bullmq';

import { prisma } from '../db/prisma/client.js';
import * as uazapi from '../integrations/uazapi.js';
import {
  createWhatsappWorker,
  type WhatsAppJobData,
} from './queue.js';

const worker = createWhatsappWorker(async (job: Job<WhatsAppJobData>) => {
  const { userId, instanceId, phone, message, type, mediaUrl, caption, clientId, appointmentId, chargeId } =
    job.data;

  if (!uazapi.isConfigured()) {
    throw new Error('uazapi não configurado');
  }

  try {
    if (mediaUrl) {
      await uazapi.sendMedia({ instanceId, phone, mediaUrl, caption });
    } else {
      await uazapi.sendText({ instanceId, phone, text: message });
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
});

worker.on('failed', (job, err) => {
  console.error(`[whatsapp.job] job ${job?.id} failed:`, err?.message);
});

worker.on('error', (err) => {
  console.error('[whatsapp.job] worker error:', err);
});

export { worker as whatsappWorker };
