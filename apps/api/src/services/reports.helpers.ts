export function parseYmdToLocalStart(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function parseYmdToLocalEnd(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function defaultReportRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: formatYmdLocal(from), to: formatYmdLocal(to) };
}

export function previousPeriodSameLength(
  fromStr: string,
  toStr: string
): { from: string; to: string } {
  const days = enumerateDaysInclusive(fromStr, toStr);
  const n = days.length;
  if (n === 0) {
    return { from: fromStr, to: toStr };
  }
  const start = parseYmdToLocalStart(fromStr);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (n - 1));
  return { from: formatYmdLocal(prevStart), to: formatYmdLocal(prevEnd) };
}

export function enumerateDaysInclusive(fromStr: string, toStr: string): string[] {
  const start = parseYmdToLocalStart(fromStr);
  const end = parseYmdToLocalEnd(toStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(formatYmdLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function isChargePaidInPeriod(
  charge: { status: string; paidAt: Date | null; dueDate: Date },
  start: Date,
  end: Date
): boolean {
  if (charge.status !== 'paid') return false;
  const ref = charge.paidAt ? new Date(charge.paidAt) : new Date(charge.dueDate);
  return ref >= start && ref <= end;
}
