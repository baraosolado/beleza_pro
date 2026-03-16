import type Stripe from 'stripe';

import { prisma } from '../db/prisma/client.js';

import { addWhatsAppJob } from '../jobs/queue.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

export async function handleStripeEvent(
  event: Stripe.Event
): Promise<ServiceResult<null>> {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const paymentIntentId = paymentIntent.id;
    const existing = await prisma.charge.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { client: true, user: { select: { whatsappInstanceId: true } } },
    });
    if (existing && existing.status === 'paid') {
      return { data: null };
    }
    if (existing) {
      await prisma.charge.update({
        where: { id: existing.id },
        data: { status: 'paid', paidAt: new Date() },
      });
      if (existing.appointmentId) {
        await prisma.appointment.update({
          where: { id: existing.appointmentId },
          data: { status: 'confirmed' },
        });
      }
      const instanceId = existing.user?.whatsappInstanceId;
      if (instanceId && existing.client) {
        const message = `Olá ${existing.client.name}! Seu pagamento foi confirmado. Obrigado!`;
        await addWhatsAppJob({
          userId: existing.userId,
          instanceId,
          phone: existing.client.phone,
          message,
          type: 'confirmation',
          clientId: existing.clientId,
          appointmentId: existing.appointmentId ?? undefined,
          chargeId: existing.id,
        });
      }
    }
  }
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const existing = await prisma.charge.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });
    if (existing && existing.status !== 'paid') {
      await prisma.charge.update({
        where: { id: existing.id },
        data: { status: 'overdue' },
      });
    }
  }
  return { data: null };
}

export async function handleUazapiEvent(payload: Record<string, unknown>): Promise<void> {
  const instanceId = (payload.instance_id ?? payload.instanceId) as string | undefined;
  const phone = (payload.phone ?? payload.from) as string | undefined;
  const message = (payload.message ?? payload.body) as string | undefined;
  if (!instanceId || !message) return;
  const user = await prisma.user.findFirst({
    where: { whatsappInstanceId: instanceId },
    select: { id: true },
  });
  if (!user) return;
  await prisma.whatsAppMessage.create({
    data: {
      userId: user.id,
      phone: phone ? String(phone).replace(/\D/g, '').slice(-11) : 'unknown',
      message: String(message).slice(0, 4096),
      type: 'custom',
      status: 'pending',
    },
  });
}
