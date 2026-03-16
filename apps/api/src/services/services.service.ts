import { prisma } from '../db/prisma/client.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

type CreateInput = { name: string; durationMin: number; price: number; active?: boolean };

type ListQuery = { active?: string };

export async function list(
  userId: string,
  query: ListQuery
): Promise<ServiceResult<unknown[]>> {
  const active =
    query.active === undefined
      ? undefined
      : query.active === 'true';
  const list = await prisma.service.findMany({
    where: { userId, ...(active !== undefined ? { active } : {}) },
    orderBy: { name: 'asc' },
  });
  return { data: list };
}

export async function create(
  userId: string,
  input: CreateInput
): Promise<ServiceResult<unknown>> {
  const service = await prisma.service.create({
    data: {
      userId,
      name: input.name,
      durationMin: input.durationMin,
      price: input.price,
      active: input.active ?? true,
    },
  });
  return { data: service };
}

export async function update(
  userId: string,
  id: string,
  input: Partial<CreateInput>
): Promise<ServiceResult<unknown>> {
  const existing = await prisma.service.findFirst({ where: { id, userId } });
  if (!existing) return { error: 'Serviço não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  const service = await prisma.service.update({
    where: { id },
    data: input,
  });
  return { data: service };
}

export async function remove(userId: string, id: string): Promise<ServiceResult<null>> {
  const existing = await prisma.service.findFirst({ where: { id, userId } });
  if (!existing) return { error: 'Serviço não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  const now = new Date();
  const futureAppointment = await prisma.appointment.findFirst({
    where: {
      serviceId: id,
      userId,
      scheduledAt: { gte: now },
      status: { in: ['scheduled', 'confirmed'] },
    },
  });
  if (futureAppointment) {
    return {
      error: 'Não é possível excluir serviço com agendamentos futuros',
      code: 'HAS_FUTURE_APPOINTMENTS',
      statusCode: 409,
    };
  }
  await prisma.service.delete({ where: { id } });
  return { data: null };
}
