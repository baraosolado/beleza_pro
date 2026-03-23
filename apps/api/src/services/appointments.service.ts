import type { AppointmentStatus } from 'types';

import { prisma } from '../db/prisma/client.js';

import { addReminderJob, addWhatsAppJob } from '../jobs/queue.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

type CreateInput = {
  clientId: string;
  serviceId: string;
  scheduledAt: Date;
  notes?: string;
  sendConfirmation?: boolean;
};

type ListQuery = {
  date?: string;
  week?: string;
  status?: string;
  page?: string;
  limit?: string;
};

const MS_24H = 24 * 60 * 60 * 1000;

function getWeekRange(weekStr: string): { start: Date; end: Date } | null {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(week) || week < 1 || week > 53) {
    return null;
  }

  const reference = new Date(year, 0, 4);
  const referenceDay = reference.getDay() || 7;
  const mondayOfWeek1 = new Date(reference);
  mondayOfWeek1.setDate(reference.getDate() - (referenceDay - 1));

  const start = new Date(mondayOfWeek1);
  start.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
}

export async function list(
  userId: string,
  query: ListQuery
): Promise<ServiceResult<{ items: unknown[]; total: number }>> {
  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
  const skip = (page - 1) * limit;

  const where: { userId: string; scheduledAt?: { gte?: Date; lt?: Date }; status?: { in: AppointmentStatus[] } } = {
    userId,
  };

  if (query.date) {
    const d = new Date(query.date);
    if (!Number.isNaN(d.getTime())) {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.scheduledAt = { gte: start, lt: end };
    }
  } else if (query.week) {
    const range = getWeekRange(query.week);
    if (range) {
      where.scheduledAt = { gte: range.start, lt: range.end };
    }
  }

  if (query.status) {
    const status = query.status as AppointmentStatus;
    if (['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
      where.status = { in: [status] };
    }
  }

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { client: true, service: true },
      orderBy: { scheduledAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  return { data: { items, total } };
}

function checkOverlap(
  userId: string,
  scheduledAt: Date,
  durationMin: number,
  excludeAppointmentId?: string
): Promise<boolean> {
  const endAt = new Date(scheduledAt.getTime() + durationMin * 60 * 1000);
  return prisma.appointment
    .findMany({
      where: {
        userId,
        status: { in: ['scheduled', 'confirmed'] },
        scheduledAt: { lt: endAt },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      include: { service: true },
    })
    .then((apps) =>
      apps.some(
        (app) =>
          app.scheduledAt.getTime() + app.service.durationMin * 60 * 1000 > scheduledAt.getTime()
      )
    );
}

export async function create(
  userId: string,
  input: CreateInput
): Promise<ServiceResult<unknown>> {
  const [client, service] = await Promise.all([
    prisma.client.findFirst({ where: { id: input.clientId, userId } }),
    prisma.service.findFirst({ where: { id: input.serviceId, userId } }),
  ]);
  if (!client) return { error: 'Cliente não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  if (!service) return { error: 'Serviço não encontrado', code: 'NOT_FOUND', statusCode: 404 };

  const hasOverlap = await checkOverlap(
    userId,
    input.scheduledAt,
    service.durationMin
  );
  if (hasOverlap) {
    return {
      error: 'Horário conflitante com outro agendamento',
      code: 'TIME_CONFLICT',
      statusCode: 409,
    };
  }

  const appointment = await prisma.appointment.create({
    data: {
      userId,
      clientId: input.clientId,
      serviceId: input.serviceId,
      scheduledAt: input.scheduledAt,
      notes: input.notes,
    },
    include: { client: true, service: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { whatsappInstanceId: true },
  });
  const instanceId = user?.whatsappInstanceId ?? '';

  if (instanceId && input.scheduledAt.getTime() - Date.now() > MS_24H) {
    const runAt = input.scheduledAt.getTime() - MS_24H;
    await addReminderJob({
      appointmentId: appointment.id,
      userId,
      runAt,
    });
  }

  if (input.sendConfirmation && instanceId) {
    const message = `Olá ${client.name}! Seu agendamento para ${service.name} foi confirmado para ${input.scheduledAt.toLocaleString('pt-BR')}.`;
    await addWhatsAppJob({
      userId,
      instanceId,
      phone: client.phone,
      message,
      type: 'confirmation',
      clientId: client.id,
      appointmentId: appointment.id,
    });
  }

  return { data: appointment };
}

export async function getById(
  userId: string,
  id: string
): Promise<ServiceResult<unknown>> {
  const appointment = await prisma.appointment.findFirst({
    where: { id, userId },
    include: { client: true, service: true },
  });
  if (!appointment) return { error: 'Agendamento não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  return { data: appointment };
}

export async function update(
  userId: string,
  id: string,
  input: Partial<CreateInput>
): Promise<ServiceResult<unknown>> {
  const existing = await prisma.appointment.findFirst({
    where: { id, userId },
    include: { service: true },
  });
  if (!existing) return { error: 'Agendamento não encontrado', code: 'NOT_FOUND', statusCode: 404 };

  const scheduledAt = input.scheduledAt ?? existing.scheduledAt;
  const serviceId = input.serviceId ?? existing.serviceId;
  const service = input.serviceId
    ? await prisma.service.findFirst({ where: { id: serviceId, userId } })
    : existing.service;
  if (!service) return { error: 'Serviço não encontrado', code: 'NOT_FOUND', statusCode: 404 };

  const durationMin = 'durationMin' in service ? service.durationMin : 0;
  const hasOverlap = await checkOverlap(userId, scheduledAt, durationMin, id);
  if (hasOverlap) {
    return {
      error: 'Horário conflitante com outro agendamento',
      code: 'TIME_CONFLICT',
      statusCode: 409,
    };
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      ...(input.clientId && { clientId: input.clientId }),
      ...(input.serviceId && { serviceId: input.serviceId }),
      ...(input.scheduledAt && { scheduledAt: input.scheduledAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include: { client: true, service: true },
  });
  return { data: appointment };
}

export async function updateStatus(
  userId: string,
  id: string,
  status: AppointmentStatus
): Promise<ServiceResult<unknown>> {
  const existing = await prisma.appointment.findFirst({
    where: { id, userId },
    include: { charges: true },
  });
  if (!existing) return { error: 'Agendamento não encontrado', code: 'NOT_FOUND', statusCode: 404 };

  if (status === 'cancelled') {
    const pendingCharges = existing.charges.filter((c) => c.status === 'pending');
    for (const ch of pendingCharges) {
      await prisma.charge.update({
        where: { id: ch.id },
        data: { status: 'cancelled' },
      });
    }
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status },
    include: { client: true, service: true },
  });
  return { data: appointment };
}

export async function remove(
  userId: string,
  id: string
): Promise<ServiceResult<null>> {
  const existing = await prisma.appointment.findFirst({ where: { id, userId } });
  if (!existing) return { error: 'Agendamento não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  await prisma.appointment.delete({ where: { id } });
  return { data: null };
}
