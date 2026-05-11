import { prisma } from '../db/prisma/client.js';

import { isChargePaidInPeriod } from './reports.helpers.js';
import type { ReportsRaw } from './reports.loader.js';

const LEDGER_MAX = 500;

export type ReportLedgerRow = {
  id: string;
  at: string;
  entity: string;
  domain: 'vendas' | 'agenda' | 'comunicacao' | 'financeiro' | 'operacional';
  metric: string;
  value: number;
  valueLabel: string;
  deltaPct: null;
  status: 'ok' | 'alerta' | 'critico';
};

const STATUS_PT: Record<string, string> = {
  scheduled: 'agendado',
  confirmed: 'confirmado',
  completed: 'concluído',
  cancelled: 'cancelado',
  no_show: 'não compareceu',
};

const WA_PT: Record<string, string> = {
  reminder: 'lembrete',
  charge: 'cobrança',
  confirmation: 'confirmação',
  custom: 'personalizada',
};

export async function buildReportLedger(
  userId: string,
  start: Date,
  end: Date,
  raw: ReportsRaw
): Promise<ReportLedgerRow[]> {
  const { appointmentsInPeriod, chargesAll, whatsappInPeriod } = raw;

  const chargesCreatedInPeriod = chargesAll.filter(
    (c) => c.createdAt >= start && c.createdAt <= end
  );

  const clientIds = new Set<string>();
  for (const a of appointmentsInPeriod) clientIds.add(a.clientId);
  for (const c of chargesCreatedInPeriod) clientIds.add(c.clientId);
  for (const c of chargesAll) {
    if (isChargePaidInPeriod(c, start, end)) clientIds.add(c.clientId);
  }
  for (const w of whatsappInPeriod) {
    if (w.clientId) clientIds.add(w.clientId);
  }

  const serviceIds = new Set(appointmentsInPeriod.map((a) => a.serviceId));

  const [clients, services] = await Promise.all([
    clientIds.size
      ? prisma.client.findMany({
          where: { userId, id: { in: [...clientIds] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    serviceIds.size
      ? prisma.service.findMany({
          where: { userId, id: { in: [...serviceIds] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const serviceName = new Map(services.map((s) => [s.id, s.name]));

  const rows: ReportLedgerRow[] = [];

  for (const a of appointmentsInPeriod) {
    const st = STATUS_PT[a.status] ?? a.status;
    const isBad = a.status === 'cancelled' || a.status === 'no_show';
    const svc = serviceName.get(a.serviceId);
    const metricBase = `Agendamento (${st})`;
    rows.push({
      id: `appt-${a.id}`,
      at: new Date(a.scheduledAt).toISOString(),
      entity: clientName.get(a.clientId) ?? 'Cliente',
      domain: 'agenda',
      metric: svc ? `${metricBase} · ${svc}` : metricBase,
      value: 1,
      valueLabel: '1',
      deltaPct: null,
      status: isBad ? 'alerta' : 'ok',
    });
  }

  for (const c of chargesCreatedInPeriod) {
    const amt = Number(c.amount);
    const isCrit = c.status === 'overdue';
    const isAlert = c.status === 'pending';
    rows.push({
      id: `charge-new-${c.id}`,
      at: new Date(c.createdAt).toISOString(),
      entity: clientName.get(c.clientId) ?? 'Cliente',
      domain: 'financeiro',
      metric: 'Cobrança criada',
      value: amt,
      valueLabel: amt.toFixed(2),
      deltaPct: null,
      status: isCrit ? 'critico' : isAlert ? 'alerta' : 'ok',
    });
  }

  for (const c of chargesAll) {
    if (!isChargePaidInPeriod(c, start, end)) continue;
    const amt = Number(c.amount);
    const ref = c.paidAt ? new Date(c.paidAt) : new Date(c.dueDate);
    rows.push({
      id: `charge-paid-${c.id}`,
      at: ref.toISOString(),
      entity: clientName.get(c.clientId) ?? 'Cliente',
      domain: 'vendas',
      metric: 'Pagamento recebido',
      value: amt,
      valueLabel: amt.toFixed(2),
      deltaPct: null,
      status: 'ok',
    });
  }

  whatsappInPeriod.forEach((w, idx) => {
    const label = WA_PT[w.type] ?? w.type;
    const entity =
      (w.clientId ? clientName.get(w.clientId) : null) ?? w.phone ?? 'WhatsApp';
    rows.push({
      id: `wa-${idx}-${w.createdAt.getTime()}`,
      at: new Date(w.createdAt).toISOString(),
      entity,
      domain: 'comunicacao',
      metric: `WhatsApp (${label})`,
      value: w.status === 'sent' ? 1 : 0,
      valueLabel:
        w.status === 'sent' ? 'Enviada' : w.status === 'failed' ? 'Falhou' : 'Pendente',
      deltaPct: null,
      status: w.status === 'failed' ? 'critico' : w.status === 'pending' ? 'alerta' : 'ok',
    });
  });

  rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return rows.slice(0, LEDGER_MAX);
}
