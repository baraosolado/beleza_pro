import type { ChargeStatus } from '@prisma/client';
import { prisma } from '../db/prisma/client.js';
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
  productId?: string;
};

type UpdateInput = {
  amount?: number;
  description?: string;
  dueDate?: Date;
  status?: ChargeStatus;
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
    dueDate?: { gte?: Date; lte?: Date; lt?: Date };
  } = { userId };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (query.status && validStatuses.includes(query.status as ChargeStatus)) {
    const status = query.status as ChargeStatus;

    if (status === 'overdue') {
      // "Inadimplente": cobranças pendentes já vencidas
      where.status = 'pending';
      where.dueDate = { ...(where.dueDate ?? {}), lt: today };
    } else if (status === 'pending') {
      // "Pendente": cobranças pendentes que ainda não venceram hoje
      where.status = 'pending';
      const existingRange = where.dueDate ?? {};
      const gte = existingRange.gte && existingRange.gte > today ? existingRange.gte : today;
      where.dueDate = { ...existingRange, gte };
    } else {
      where.status = status;
    }
  }
  if (query.startDate) {
    const d = new Date(query.startDate);
    if (!Number.isNaN(d.getTime())) {
      const existing = where.dueDate ?? {};
      const gte = existing.gte && existing.gte > d ? existing.gte : d;
      where.dueDate = { ...existing, gte };
    }
  }
  if (query.endDate) {
    const d = new Date(query.endDate);
    if (!Number.isNaN(d.getTime())) {
      const existing = where.dueDate ?? {};
      const lte = existing.lte && existing.lte < d ? existing.lte : d;
      where.dueDate = { ...existing, lte };
    }
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

  const charge = await prisma.$transaction(async (tx) => {
    if (input.productId) {
      const product = await tx.product.findFirst({
        where: { id: input.productId, userId },
      });
      if (!product) {
        return Promise.reject({
          error: 'Produto não encontrado',
          code: 'PRODUCT_NOT_FOUND',
          statusCode: 404,
        } as ServiceResult<unknown>);
      }
      if (product.stockQuantity <= 0) {
        return Promise.reject({
          error: 'Estoque insuficiente para registrar venda deste produto',
          code: 'INSUFFICIENT_STOCK',
          statusCode: 400,
        } as ServiceResult<unknown>);
      }

      await tx.product.update({
        where: { id: product.id },
        data: {
          stockQuantity: product.stockQuantity - 1,
        },
      });
    }

    return tx.charge.create({
      data: {
        userId,
        appointmentId: input.appointmentId,
        clientId: input.clientId,
        amount: input.amount,
        description: input.description,
        dueDate: input.dueDate,
        stripePaymentIntentId: null,
        stripePixQrcode: null,
        stripePixCopyPaste: null,
      },
      include: { client: true, appointment: true },
    });
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

export async function update(
  userId: string,
  id: string,
  input: UpdateInput
): Promise<ServiceResult<unknown>> {
  const existing = await prisma.charge.findFirst({
    where: { id, userId },
  });
  if (!existing) return { error: 'Cobrança não encontrada', code: 'NOT_FOUND', statusCode: 404 };

  const isMarkedPaid = input.status === 'paid' && existing.status !== 'paid';
  const charge = await prisma.charge.update({
    where: { id },
    data: {
      amount: input.amount ?? existing.amount,
      description: input.description ?? existing.description,
      dueDate: input.dueDate ?? existing.dueDate,
      status: input.status ?? existing.status,
      ...(isMarkedPaid && !existing.paidAt && { paidAt: new Date() }),
    },
  });

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

export async function remove(userId: string, id: string): Promise<ServiceResult<null>> {
  const existing = await prisma.charge.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return { error: 'Cobrança não encontrada', code: 'NOT_FOUND', statusCode: 404 };
  }

  await prisma.charge.delete({ where: { id } });
  return { data: null };
}
