import { prisma } from '../db/prisma/client.js';

import {
  formatYmdLocal,
  isChargePaidInPeriod,
} from './reports.helpers.js';
import { buildReportLedger } from './reports.ledger.js';
import type { ReportsRaw } from './reports.loader.js';

type CountRecord = Record<string, number>;

export async function assembleFullReport(
  userId: string,
  fromStr: string,
  toStr: string,
  days: string[],
  start: Date,
  end: Date,
  todayStart: Date,
  raw: ReportsRaw,
  options?: { includeLedger?: boolean }
): Promise<unknown> {
  const includeLedger = options?.includeLedger !== false;
  const {
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
  } = raw;

  const appointmentStatusCount: CountRecord = {};
  let remindersEligible = 0;
  let remindersSent = 0;
  for (const a of appointmentsInPeriod) {
    appointmentStatusCount[a.status] = (appointmentStatusCount[a.status] ?? 0) + 1;
    if (a.status === 'scheduled' || a.status === 'confirmed') {
      remindersEligible += 1;
      if (a.reminderSent) remindersSent += 1;
    }
  }

  const chargesCreatedInPeriod = chargesAll.filter(
    (c) => c.createdAt >= start && c.createdAt <= end
  );
  const chargesCreatedByStatus: CountRecord = {};
  let chargesCreatedAmount = 0;
  for (const c of chargesCreatedInPeriod) {
    chargesCreatedByStatus[c.status] = (chargesCreatedByStatus[c.status] ?? 0) + 1;
    chargesCreatedAmount += Number(c.amount);
  }

  let paidInPeriodSum = 0;
  let paidInPeriodCount = 0;
  const paidByClient = new Map<string, number>();
  for (const c of chargesAll) {
    if (!isChargePaidInPeriod(c, start, end)) continue;
    const amt = Number(c.amount);
    paidInPeriodSum += amt;
    paidInPeriodCount += 1;
    paidByClient.set(c.clientId, (paidByClient.get(c.clientId) ?? 0) + amt);
  }

  let openPendingSum = 0;
  let openOverdueSum = 0;
  let openPendingCount = 0;
  let openOverdueCount = 0;
  for (const c of chargesAll) {
    if (c.status === 'paid' || c.status === 'cancelled') continue;
    const amt = Number(c.amount);
    const dueDay = new Date(c.dueDate);
    const dueDateOnly = new Date(dueDay.getFullYear(), dueDay.getMonth(), dueDay.getDate());
    if (dueDateOnly < todayStart) {
      openOverdueSum += amt;
      openOverdueCount += 1;
    } else {
      openPendingSum += amt;
      openPendingCount += 1;
    }
  }

  const whatsappByType: CountRecord = {};
  const whatsappByStatus: CountRecord = {};
  let whatsappSent = 0;
  for (const w of whatsappInPeriod) {
    whatsappByType[w.type] = (whatsappByType[w.type] ?? 0) + 1;
    whatsappByStatus[w.status] = (whatsappByStatus[w.status] ?? 0) + 1;
    if (w.status === 'sent') whatsappSent += 1;
  }

  const apptByDay = new Map<string, number>();
  for (const d of days) apptByDay.set(d, 0);
  for (const a of appointmentsInPeriod) {
    const key = formatYmdLocal(new Date(a.scheduledAt));
    apptByDay.set(key, (apptByDay.get(key) ?? 0) + 1);
  }

  const paidByDay = new Map<string, number>();
  for (const d of days) paidByDay.set(d, 0);
  for (const c of chargesAll) {
    if (c.status !== 'paid') continue;
    const ref = c.paidAt ? new Date(c.paidAt) : new Date(c.dueDate);
    if (ref < start || ref > end) continue;
    const key = formatYmdLocal(ref);
    paidByDay.set(key, (paidByDay.get(key) ?? 0) + Number(c.amount));
  }

  const waByDay = new Map<string, number>();
  for (const d of days) waByDay.set(d, 0);
  for (const w of whatsappInPeriod) {
    const key = formatYmdLocal(new Date(w.createdAt));
    waByDay.set(key, (waByDay.get(key) ?? 0) + 1);
  }

  const clientApptCount = new Map<string, number>();
  for (const a of appointmentsInPeriod) {
    clientApptCount.set(a.clientId, (clientApptCount.get(a.clientId) ?? 0) + 1);
  }
  const serviceApptCount = new Map<string, number>();
  for (const a of appointmentsInPeriod) {
    serviceApptCount.set(a.serviceId, (serviceApptCount.get(a.serviceId) ?? 0) + 1);
  }

  const topClientIds = [...clientApptCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([clientId, count]) => ({ clientId, count }));
  const topRevenueIds = [...paidByClient.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([clientId, totalPaid]) => ({ clientId, totalPaid }));

  const topServiceIds = [...serviceApptCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([serviceId, count]) => ({ serviceId, count }));

  const clientIdsNeeded = new Set<string>([
    ...topClientIds.map((x) => x.clientId),
    ...topRevenueIds.map((x) => x.clientId),
  ]);
  const serviceIdsNeeded = new Set(topServiceIds.map((x) => x.serviceId));

  const [clientRows, serviceRows] = await Promise.all([
    clientIdsNeeded.size
      ? prisma.client.findMany({
          where: { userId, id: { in: [...clientIdsNeeded] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    serviceIdsNeeded.size
      ? prisma.service.findMany({
          where: { userId, id: { in: [...serviceIdsNeeded] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const clientNameById = new Map(clientRows.map((c) => [c.id, c.name]));
  const serviceNameById = new Map(serviceRows.map((s) => [s.id, s.name]));

  let lowStockCount = 0;
  let inventoryRetail = 0;
  let inventoryCost = 0;
  for (const p of productsRows) {
    const price = Number(p.price);
    const cost = p.costPrice != null ? Number(p.costPrice) : 0;
    inventoryRetail += price * p.stockQuantity;
    inventoryCost += cost * p.stockQuantity;
    if (p.lowStockAlert) {
      const threshold = p.lowStockThreshold ?? 0;
      if (p.stockQuantity <= threshold) lowStockCount += 1;
    }
  }

  const participantStatusMap: CountRecord = {};
  for (const row of participantsByStatus) {
    participantStatusMap[row.status] = row._count._all;
  }

  const completed = appointmentStatusCount.completed ?? 0;
  const noShow = appointmentStatusCount.no_show ?? 0;
  const denomOutcome = completed + noShow;
  const noShowRate = denomOutcome > 0 ? noShow / denomOutcome : 0;
  const reminderRate =
    remindersEligible > 0 ? remindersSent / remindersEligible : 0;
  const waTotal = whatsappInPeriod.length;
  const waSuccessRate = waTotal > 0 ? whatsappSent / waTotal : 0;

  const ledger = includeLedger
    ? await buildReportLedger(userId, start, end, raw)
    : [];

  return {
    period: { from: fromStr, to: toStr },
    snapshot: {
      clientsTotal,
      servicesTotal,
      servicesActive,
      productsTotal: productsRows.length,
      productCategoriesCount,
      consorcioParticipantsTotal: participantsTotal,
      consorcioPdfsTotal: pdfsTotal,
    },
    periodMetrics: {
      clientsNew: clientsNewInPeriod,
      appointmentsTotal: appointmentsInPeriod.length,
      appointmentsByStatus: appointmentStatusCount,
      reminderSentRateAmongScheduledConfirmed: reminderRate,
      noShowRateAmongCompletedOrNoShow: noShowRate,
      chargesCreatedCount: chargesCreatedInPeriod.length,
      chargesCreatedByStatus: chargesCreatedByStatus,
      chargesCreatedTotalAmount: chargesCreatedAmount,
      chargesPaidInPeriodCount: paidInPeriodCount,
      chargesPaidInPeriodSum: paidInPeriodSum,
      chargesOpenPendingCount: openPendingCount,
      chargesOpenPendingSum: openPendingSum,
      chargesOpenOverdueCount: openOverdueCount,
      chargesOpenOverdueSum: openOverdueSum,
      whatsappMessagesTotal: waTotal,
      whatsappByType,
      whatsappByStatus,
      whatsappSuccessRate: waSuccessRate,
      consorcioDrawsCount: drawsInPeriod,
      notificationsLogCount: notificationsInPeriod,
    },
    products: {
      lowStockCount,
      inventoryRetailValue: inventoryRetail,
      inventoryCostValue: inventoryCost,
    },
    consorcio: {
      participantsByStatus: participantStatusMap,
    },
    rankings: {
      topClientsByAppointments: topClientIds.map((row) => ({
        clientId: row.clientId,
        name: clientNameById.get(row.clientId) ?? 'Cliente',
        appointments: row.count,
      })),
      topClientsByPaidCharges: topRevenueIds.map((row) => ({
        clientId: row.clientId,
        name: clientNameById.get(row.clientId) ?? 'Cliente',
        totalPaid: row.totalPaid,
      })),
      topServicesByAppointments: topServiceIds.map((row) => ({
        serviceId: row.serviceId,
        name: serviceNameById.get(row.serviceId) ?? 'Serviço',
        appointments: row.count,
      })),
    },
    timeseries: {
      appointmentsByDay: days.map((date) => ({
        date,
        count: apptByDay.get(date) ?? 0,
      })),
      chargesPaidAmountByDay: days.map((date) => ({
        date,
        amount: paidByDay.get(date) ?? 0,
      })),
      whatsappMessagesByDay: days.map((date) => ({
        date,
        count: waByDay.get(date) ?? 0,
      })),
    },
    charts: {
      maxAppointmentsPerDay: Math.max(0, ...days.map((d) => apptByDay.get(d) ?? 0)),
      maxPaidPerDay: Math.max(0, ...days.map((d) => paidByDay.get(d) ?? 0)),
      maxWhatsappPerDay: Math.max(0, ...days.map((d) => waByDay.get(d) ?? 0)),
    },
    ledger,
  };
}
