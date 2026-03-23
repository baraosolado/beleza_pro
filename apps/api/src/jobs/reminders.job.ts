import type { Job } from 'bullmq';

import { prisma } from '../db/prisma/client.js';

import {
  addWhatsAppJob,
  createRemindersWorker,
  isRedisEnabled,
  type ReminderJobData,
} from './queue.js';

const worker = isRedisEnabled
  ? createRemindersWorker(async (job: Job<ReminderJobData>) => {
    const { appointmentId, userId } = job.data;
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, userId },
      include: { client: true, service: true },
    });
    if (
      !appointment ||
      !['scheduled', 'confirmed'].includes(appointment.status) ||
      appointment.reminderSent
    ) {
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { whatsappInstanceId: true },
    });
    const instanceId = user?.whatsappInstanceId;
    if (!instanceId) return;

    const message = `Olá ${appointment.client.name}! Lembrando do seu agendamento para ${appointment.service.name} amanhã às ${appointment.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
    await addWhatsAppJob({
      userId,
      instanceId,
      phone: appointment.client.phone,
      message,
      type: 'reminder',
      clientId: appointment.clientId,
      appointmentId: appointment.id,
    });
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { reminderSent: true },
    });
})
  : null;

if (worker) {
  worker.on('failed', (job, err) => {
    console.error(`[reminders.job] job ${job?.id} failed:`, err?.message);
  });
} else {
  console.warn('[reminders.job] Worker não iniciado: REDIS_URL vazio — lembretes agendados desativados');
}

export { worker as remindersWorker };
