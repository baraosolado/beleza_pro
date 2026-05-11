import { prisma } from '../db/prisma/client.js';

export async function loadReportsRaw(
  userId: string,
  start: Date,
  end: Date
): Promise<{
  clientsTotal: number;
  clientsNewInPeriod: number;
  servicesTotal: number;
  servicesActive: number;
  productsRows: Array<{
    id: string;
    price: unknown;
    costPrice: unknown;
    stockQuantity: number;
    lowStockAlert: boolean;
    lowStockThreshold: number | null;
  }>;
  productCategoriesCount: number;
  appointmentsInPeriod: Array<{
    id: string;
    status: string;
    reminderSent: boolean;
    scheduledAt: Date;
    clientId: string;
    serviceId: string;
  }>;
  chargesAll: Array<{
    id: string;
    amount: unknown;
    status: string;
    dueDate: Date;
    paidAt: Date | null;
    createdAt: Date;
    clientId: string;
  }>;
  whatsappInPeriod: Array<{
    type: string;
    status: string;
    createdAt: Date;
    phone: string;
    clientId: string | null;
  }>;
  drawsInPeriod: number;
  participantsByStatus: Array<{ status: string; _count: { _all: number } }>;
  participantsTotal: number;
  pdfsTotal: number;
  notificationsInPeriod: number;
}> {
  const [
    clientsTotal,
    clientsNewInPeriod,
    servicesTotal,
    servicesActive,
    productsRows,
    productCategoriesCount,
    appointmentsInPeriod,
    chargesAll,
    whatsappInPeriod,
    drawsInPeriod,
    participantsByStatus,
    participantsTotal,
    pdfsTotal,
    notificationsInPeriod,
  ] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.client.count({
      where: { userId, createdAt: { gte: start, lte: end } },
    }),
    prisma.service.count({ where: { userId } }),
    prisma.service.count({ where: { userId, active: true } }),
    prisma.product.findMany({
      where: { userId },
      select: {
        id: true,
        price: true,
        costPrice: true,
        stockQuantity: true,
        lowStockAlert: true,
        lowStockThreshold: true,
      },
    }),
    prisma.productCategory.count({ where: { userId } }),
    prisma.appointment.findMany({
      where: { userId, scheduledAt: { gte: start, lte: end } },
      select: {
        id: true,
        status: true,
        reminderSent: true,
        scheduledAt: true,
        clientId: true,
        serviceId: true,
      },
    }),
    prisma.charge.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        status: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
        clientId: true,
      },
    }),
    prisma.whatsAppMessage.findMany({
      where: { userId, createdAt: { gte: start, lte: end } },
      select: { type: true, status: true, createdAt: true, phone: true, clientId: true },
    }),
    prisma.consorcioDraw.count({
      where: { userId, drawnAt: { gte: start, lte: end } },
    }),
    prisma.consorcioParticipant.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.consorcioParticipant.count({ where: { userId } }),
    prisma.consorcioPdf.count({ where: { userId } }),
    prisma.notificationsLog.count({
      where: { userId, createdAt: { gte: start, lte: end } },
    }),
  ]);

  return {
    clientsTotal,
    clientsNewInPeriod,
    servicesTotal,
    servicesActive,
    productsRows,
    productCategoriesCount,
    appointmentsInPeriod,
    chargesAll,
    whatsappInPeriod,
    drawsInPeriod,
    participantsByStatus,
    participantsTotal,
    pdfsTotal,
    notificationsInPeriod,
  };
}

export type ReportsRaw = Awaited<ReturnType<typeof loadReportsRaw>>;
