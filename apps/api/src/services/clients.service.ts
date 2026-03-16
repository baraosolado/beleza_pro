import { prisma } from '../db/prisma/client.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

type CreateInput = { name: string; phone: string; email?: string; notes?: string };

type ListQuery = { search?: string; page?: string; limit?: string };

export async function list(
  userId: string,
  query: ListQuery
): Promise<ServiceResult<{ items: unknown[]; total: number }>> {
  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
  const skip = (page - 1) * limit;
  const search = query.search?.trim();
  const where = {
    userId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);
  return { data: { items, total } };
}

export async function create(
  userId: string,
  input: CreateInput
): Promise<ServiceResult<unknown>> {
  const client = await prisma.client.create({
    data: {
      userId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
    },
  });
  return { data: client };
}

export async function getById(
  userId: string,
  id: string
): Promise<ServiceResult<unknown>> {
  const client = await prisma.client.findFirst({
    where: { id, userId },
  });
  if (!client) return { error: 'Cliente não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  return { data: client };
}

export async function update(
  userId: string,
  id: string,
  input: Partial<CreateInput>
): Promise<ServiceResult<unknown>> {
  const existing = await prisma.client.findFirst({ where: { id, userId } });
  if (!existing) return { error: 'Cliente não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  const client = await prisma.client.update({
    where: { id },
    data: input,
  });
  return { data: client };
}

export async function remove(
  userId: string,
  id: string
): Promise<ServiceResult<null>> {
  const existing = await prisma.client.findFirst({ where: { id, userId } });
  if (!existing) return { error: 'Cliente não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  await prisma.client.delete({ where: { id } });
  return { data: null };
}

export async function getAppointments(
  userId: string,
  id: string
): Promise<ServiceResult<unknown[]>> {
  const client = await prisma.client.findFirst({ where: { id, userId } });
  if (!client) return { error: 'Cliente não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  const appointments = await prisma.appointment.findMany({
    where: { clientId: id, userId },
    include: { service: true },
    orderBy: { scheduledAt: 'desc' },
  });
  return { data: appointments };
}
