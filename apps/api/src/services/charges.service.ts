import type { ChargeStatus } from '@prisma/client';
import { prisma } from '../db/prisma/client.js';

import { createPaymentIntent, getStripe, retrievePaymentIntent } from '../integrations/stripe.js';
import { addWhatsAppJob } from '../jobs/queue.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

type CreateInput = {
  appointmentId?: string;
  clientId: string;
  amount: number;
  description?: string;
  dueDate: Date;
};

type ListQuery = {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  limit?: string;
};

export async function list(
  userId: string,
  query: ListQuery
): Promise<ServiceResult<{ items: unknown[]; total: number }>> {
  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
  const skip = (page - 1) * limit;

  const validStatuses: ChargeStatus[] = ['pending', 'paid', 'overdue', 'cancelled'];
  const where: {
    userId: string;
    status?: ChargeStatus;
    dueDate?: { gte?: Date; lte?: Date };
  } = { userId };

  if (query.status && validStatuses.includes(query.status as ChargeStatus)) {
    where.status = query.status as ChargeStatus;
  }
  if (query.startDate) {
    const d = new Date(query.startDate);
    if (!Number.isNaN(d.getTime())) where.dueDate = { ...where.dueDate, gte: d };
  }
  if (query.endDate) {
    const d = new Date(query.endDate);
    if (!Number.isNaN(d.getTime())) where.dueDate = { ...where.dueDate, lte: d };
  }

  const [items, total] = await Promise.all([
    prisma.charge.findMany({
      where,
      include: { client: true, appointment: true },
      orderBy: { dueDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.charge.count({ where }),
  ]);

  return { data: { items, total } };
}

export async function create(
  userId: string,
  input: CreateInput
): Promise<ServiceResult<unknown>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, whatsappInstanceId: true },
  });
  if (!user || (user.plan !== 'pro' && user.plan !== 'trial')) {
    return { error: 'Cobrança Pix disponível apenas no plano Pro', code: 'PLAN_REQUIRED', statusCode: 403 };
  }

  const client = await prisma.client.findFirst({
    where: { id: input.clientId, userId },
  });
  if (!client) return { error: 'Cliente não encontrado', code: 'NOT_FOUND', statusCode: 404 };

  const stripe = getStripe();
  if (!stripe) {
    return { error: 'Pagamentos não configurados', code: 'STRIPE_NOT_CONFIGURED', statusCode: 503 };
  }

  const paymentIntent = await createPaymentIntent({
    amount: input.amount,
    currency: 'brl',
    metadata: {
      userId,
      clientId: input.clientId,
      ...(input.appointmentId && { appointmentId: input.appointmentId }),
    },
  });
  if (!paymentIntent) {
    return { error: 'Falha ao criar cobrança', code: 'STRIPE_ERROR', statusCode: 503 };
  }

  const charge = await prisma.charge.create({
    data: {
      userId,
      appointmentId: input.appointmentId,
      clientId: input.clientId,
      amount: input.amount,
      description: input.description,
      dueDate: input.dueDate,
      stripePaymentIntentId: paymentIntent.id,
      stripePixQrcode: null,
      stripePixCopyPaste: null,
    },
    include: { client: true, appointment: true },
  });

  const instanceId = user.whatsappInstanceId;
  if (instanceId) {
    const message = `Olá ${client.name}! Você tem uma cobrança de R$ ${input.amount.toFixed(2).replace('.', ',')}. Acesse o link para pagar.`;
    await addWhatsAppJob({
      userId,
      instanceId,
      phone: client.phone,
      message,
      type: 'charge',
      clientId: client.id,
      chargeId: charge.id,
    });
  }

  return { data: charge };
}

export async function getById(
  userId: string,
  id: string
): Promise<ServiceResult<unknown>> {
  const charge = await prisma.charge.findFirst({
    where: { id, userId },
    include: { client: true, appointment: true },
  });
  if (!charge) return { error: 'Cobrança não encontrada', code: 'NOT_FOUND', statusCode: 404 };
  return { data: charge };
}

export async function getPix(
  userId: string,
  id: string
): Promise<ServiceResult<{ qrcode: string | null; copyPaste: string | null }>> {
  const charge = await prisma.charge.findFirst({
    where: { id, userId },
    select: { stripePixQrcode: true, stripePixCopyPaste: true },
  });
  if (!charge) return { error: 'Cobrança não encontrada', code: 'NOT_FOUND', statusCode: 404 };
  return {
    data: {
      qrcode: charge.stripePixQrcode,
      copyPaste: charge.stripePixCopyPaste,
    },
  };
}

export async function getPaymentLink(
  userId: string,
  id: string
): Promise<ServiceResult<{ clientSecret: string | null }>> {
  const charge = await prisma.charge.findFirst({
    where: { id, userId },
    select: { stripePaymentIntentId: true, status: true },
  });
  if (!charge) return { error: 'Cobrança não encontrada', code: 'NOT_FOUND', statusCode: 404 };
  if (charge.status === 'paid') {
    return { data: { clientSecret: null } };
  }
  if (!charge.stripePaymentIntentId) {
    return { data: { clientSecret: null } };
  }
  const pi = await retrievePaymentIntent(charge.stripePaymentIntentId);
  if (!pi || !pi.client_secret) {
    return { error: 'Link de pagamento indisponível', code: 'PAYMENT_LINK_UNAVAILABLE', statusCode: 503 };
  }
  return { data: { clientSecret: pi.client_secret } };
}
