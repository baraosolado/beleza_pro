import type { ReportLedgerRow } from './reports.types';

export const REPORT_DOMAINS = [
  { id: 'vendas', label: 'Vendas / recebimento' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'comunicacao', label: 'WhatsApp' },
  { id: 'financeiro', label: 'Cobranças' },
  { id: 'operacional', label: 'Produtos e consórcio' },
] as const;

export type ReportDomainId = (typeof REPORT_DOMAINS)[number]['id'];

export function parseDomainsParam(raw: string | null): ReportDomainId[] | null {
  if (!raw?.trim()) return null;
  const allowed = new Set(REPORT_DOMAINS.map((d) => d.id));
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const out = parts.filter((p): p is ReportDomainId => allowed.has(p as ReportDomainId));
  return out.length ? out : null;
}

export function serializeDomainsParam(ids: ReportDomainId[] | null): string {
  if (!ids?.length) return '';
  return ids.join(',');
}

export function filterLedgerByDomains(
  rows: ReportLedgerRow[],
  domains: ReportDomainId[] | null
): ReportLedgerRow[] {
  if (!domains?.length) return rows;
  const set = new Set(domains);
  return rows.filter((r) => set.has(r.domain));
}
