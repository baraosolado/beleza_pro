import { prisma } from '../db/prisma/client.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

type CreateInput = { name: string; phone: string; email?: string; notes?: string };

type ListQuery = { search?: string; page?: string; limit?: string; status?: 'all' | 'active' | 'new' };

export async function list(
  userId: string,
  query: ListQuery
): Promise<ServiceResult<{ items: unknown[]; total: number }>> {
  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
  const skip = (page - 1) * limit;
  const search = query.search?.trim();
  const status = query.status && query.status !== 'all' ? query.status : undefined;

  const where: Record<string, unknown> = {
    userId,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { phone: { contains: search, mode: 'insensitive' as const } },
    ];
  }

  if (status === 'new') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    (where as any).createdAt = { gte: startOfMonth };
  }

  if (status === 'active') {
    (where as any).appointments = { some: { userId } };
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  const clientIds = clients.map((c) => c.id);

  if (clientIds.length === 0) {
    return { data: { items: [], total: 0 } };
  }

  const [lastAppointments, totals] = await Promise.all([
    prisma.appointment.groupBy({
      by: ['clientId'],
      where: { userId, clientId: { in: clientIds } },
      _max: { scheduledAt: true },
    }),
    prisma.charge.groupBy({
      by: ['clientId'],
      where: { userId, clientId: { in: clientIds }, status: 'paid' },
      _sum: { amount: true },
    }),
  ]);

  const lastMap = new Map<string, Date | null>();
  lastAppointments.forEach((row) => {
    lastMap.set(row.clientId, row._max.scheduledAt ?? null);
  });

  const totalMap = new Map<string, number>();
  totals.forEach((row) => {
    totalMap.set(row.clientId, Number(row._sum.amount ?? 0));
  });

  const items = clients.map((client) => ({
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
    createdAt: client.createdAt,
    lastAppointmentAt: lastMap.get(client.id) ?? null,
    totalSpent: totalMap.get(client.id) ?? 0,
  }));

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
  const [appointmentsCount, chargesByStatus, lastPayment] = await Promise.all([
    prisma.appointment.count({ where: { userId, clientId: id } }),
    prisma.charge.groupBy({
      by: ['status'],
      where: { userId, clientId: id },
      _sum: { amount: true },
    }),
    prisma.charge.findFirst({
      where: { userId, clientId: id, status: 'paid' },
      orderBy: { paidAt: 'desc' },
      select: { paidAt: true },
    }),
  ]);

  let totalReceived = 0;
  let totalPending = 0;

  chargesByStatus.forEach((row) => {
    const amount = Number(row._sum.amount ?? 0);
    if (row.status === 'paid') {
      totalReceived += amount;
    } else if (row.status === 'pending' || row.status === 'overdue') {
      totalPending += amount;
    }
  });

  const totalSpent = totalReceived + totalPending;

  return {
    data: {
      ...client,
      appointmentsCount,
      totalReceived,
      totalPending,
      totalSpent,
      lastPaymentAt: lastPayment?.paidAt ?? null,
    },
  };
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
