import { prisma } from '../db/prisma/client.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

export async function summary(
  userId: string
): Promise<
  ServiceResult<{
    todayAppointments: number;
    monthReceived: number;
    monthPending: number;
    activeClientsCount: number;
  }>
> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [todayAppointments, monthReceived, monthPending, activeClientsCount] = await Promise.all([
    prisma.appointment.count({
      where: {
        userId,
        scheduledAt: { gte: startOfDay, lt: endOfDay },
        status: { in: ['scheduled', 'confirmed'] },
      },
    }),
    prisma.charge.aggregate({
      where: {
        userId,
        status: 'paid',
        paidAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.charge.aggregate({
      where: {
        userId,
        status: 'pending',
        dueDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.client.count({ where: { userId } }),
  ]);

  return {
    data: {
      todayAppointments,
      monthReceived: Number(monthReceived._sum.amount ?? 0),
      monthPending: Number(monthPending._sum.amount ?? 0),
      activeClientsCount,
    },
  };
}

export async function upcoming(
  userId: string
): Promise<ServiceResult<unknown[]>> {
  const now = new Date();
  const list = await prisma.appointment.findMany({
    where: {
      userId,
      scheduledAt: { gte: now },
      status: { in: ['scheduled', 'confirmed'] },
    },
    include: { client: true, service: true },
    orderBy: { scheduledAt: 'asc' },
    take: 5,
  });
  return { data: list };
}

type FinancialQuery = { startDate?: string; endDate?: string };

export async function financial(
  userId: string,
  query: FinancialQuery
): Promise<
  ServiceResult<{
    received: number;
    pending: number;
    overdue: number;
  }>
> {
  const start = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = query.endDate ? new Date(query.endDate) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Datas inválidas', code: 'VALIDATION_ERROR', statusCode: 400 };
  }

  const [received, pending, overdue] = await Promise.all([
    prisma.charge.aggregate({
      where: {
        userId,
        status: 'paid',
        paidAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.charge.aggregate({
      where: {
        userId,
        status: 'pending',
        dueDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.charge.aggregate({
      where: {
        userId,
        status: 'overdue',
        dueDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    data: {
      received: Number(received._sum.amount ?? 0),
      pending: Number(pending._sum.amount ?? 0),
      overdue: Number(overdue._sum.amount ?? 0),
    },
  };
}
