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
    monthOverdue: number;
    activeClientsCount: number;
  }>
> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [
    todayAppointments,
    receivedWithPaidAt,
    receivedWithoutPaidAt,
    monthPending,
    monthOverdue,
    activeClientsCount,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        userId,
        scheduledAt: { gte: startOfDay, lt: endOfDay },
        status: { in: ['scheduled', 'confirmed'] },
      },
    }),
    // Recebido no mês: pago com paidAt no mês
    prisma.charge
      .aggregate({
        where: {
          userId,
          status: 'paid',
          paidAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      })
      .then((r) => Number(r._sum.amount ?? 0)),
    // Pago sem paidAt preenchido (marcado manualmente): considera dueDate no mês
    prisma.charge
      .aggregate({
        where: {
          userId,
          status: 'paid',
          paidAt: null,
          dueDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      })
      .then((r) => Number(r._sum.amount ?? 0)),
    prisma.charge.aggregate({
      where: {
        userId,
        status: 'pending',
        dueDate: { gte: startOfDay },
      },
      _sum: { amount: true },
    }),
    prisma.charge.aggregate({
      where: {
        userId,
        status: 'pending',
        dueDate: { lt: startOfDay },
      },
      _sum: { amount: true },
    }),
    prisma.client.count({ where: { userId } }),
  ]);

  return {
    data: {
      todayAppointments,
      monthReceived: receivedWithPaidAt + receivedWithoutPaidAt,
      monthPending: Number(monthPending._sum.amount ?? 0),
      monthOverdue: Number(monthOverdue._sum.amount ?? 0),
      activeClientsCount,
    },
  };
}

export async function upcoming(
  userId: string,
  options?: { todayOnly?: boolean }
): Promise<ServiceResult<unknown[]>> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const where: Parameters<typeof prisma.appointment.findMany>[0]['where'] = {
    userId,
    status: { in: ['scheduled', 'confirmed'] },
  };

  if (options?.todayOnly) {
    where.scheduledAt = { gte: startOfDay, lt: endOfDay };
  } else {
    where.scheduledAt = { gte: now };
  }

  const list = await prisma.appointment.findMany({
    where,
    include: { client: true, service: true },
    orderBy: { scheduledAt: 'asc' },
    take: options?.todayOnly ? 50 : 5,
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
  const hasCustomRange = !!(query.startDate || query.endDate);

  // Quando não há filtro de data explícito (modo "Todos" na UI),
  // usamos um intervalo bem amplo para considerar todo o histórico.
  const start = query.startDate
    ? new Date(query.startDate)
    : hasCustomRange
      ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      : new Date(2000, 0, 1);

  const end = query.endDate
    ? new Date(query.endDate)
    : hasCustomRange
      ? new Date()
      : new Date(2100, 0, 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Datas inválidas', code: 'VALIDATION_ERROR', statusCode: 400 };
  }

  // Normalizamos "hoje" em meia-noite para comparar só por data (igual à UI)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Buscamos as cobranças do usuário que tenham alguma relação com o período:
  // - Se foi paga: usamos paidAt (se existir) OU dueDate como referência
  // - Se ainda não foi paga: usamos dueDate como referência
  const charges = await prisma.charge.findMany({
    where: {
      userId,
    },
    select: {
      amount: true,
      status: true,
      dueDate: true,
      paidAt: true,
      createdAt: true,
    },
  });

  let receivedTotal = 0;
  let pendingTotal = 0;
  let overdueTotal = 0;

  for (const charge of charges) {
    const amount = Number(charge.amount ?? 0);

    // Data de referência para filtro de período:
    // - Se estiver paga: paidAt > dueDate > createdAt > hoje
    // - Se não estiver paga: dueDate > createdAt, senão ignora
    let referenceDate: Date | null = null;
    if (charge.status === 'paid') {
      if (charge.paidAt) {
        referenceDate = new Date(charge.paidAt);
      } else if (charge.dueDate) {
        referenceDate = new Date(charge.dueDate);
      } else if (charge.createdAt) {
        referenceDate = new Date(charge.createdAt);
      } else {
        referenceDate = today;
      }
    } else if (charge.dueDate) {
      referenceDate = new Date(charge.dueDate);
    } else if (charge.createdAt) {
      referenceDate = new Date(charge.createdAt);
    }

    // Se temos um período custom (start/end vindos da query),
    // só consideramos cobranças cuja data de referência cai dentro desse intervalo.
    if (!referenceDate || referenceDate < start || referenceDate > end) {
      continue;
    }

    // Total recebido: qualquer cobrança com status pago dentro do período
    if (charge.status === 'paid') {
      receivedTotal += amount;
      continue;
    }

    // Ignoramos canceladas no resumo financeiro
    if (charge.status === 'cancelled') {
      continue;
    }

    // Para pendente / inadimplente usamos a mesma regra da UI (status efetivo):
    // - Se dueDate < hoje -> inadimplente
    // - Se dueDate >= hoje -> pendente
    if (!charge.dueDate) continue;
    const due = new Date(charge.dueDate);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    if (dueDay < today) {
      overdueTotal += amount;
    } else {
      pendingTotal += amount;
    }
  }

  return {
    data: {
      received: receivedTotal,
      pending: pendingTotal,
      overdue: overdueTotal,
    },
  };
}
