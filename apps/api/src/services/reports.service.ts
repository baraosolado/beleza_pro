import { assembleFullReport } from './reports.assemble.js';
import {
  buildReportComparison,
  type ReportComparisonPayload,
  type ReportMetricsSlice,
} from './reports.comparison.js';
import {
  defaultReportRange,
  enumerateDaysInclusive,
  parseYmdToLocalEnd,
  parseYmdToLocalStart,
  previousPeriodSameLength,
} from './reports.helpers.js';
import { loadReportsRaw } from './reports.loader.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

export type ReportsQuery = {
  from?: string;
  to?: string;
  compare?: 'previous';
};

const MAX_RANGE_DAYS = 366;

export async function getFullReport(
  userId: string,
  query: ReportsQuery
): Promise<ServiceResult<unknown>> {
  const fallback = defaultReportRange();
  const fromStr = query.from?.trim() || fallback.from;
  const toStr = query.to?.trim() || fallback.to;

  const start = parseYmdToLocalStart(fromStr);
  const end = parseYmdToLocalEnd(toStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Datas inválidas', code: 'VALIDATION_ERROR', statusCode: 400 };
  }
  if (start > end) {
    return { error: 'Data inicial maior que a final', code: 'VALIDATION_ERROR', statusCode: 400 };
  }
  const spanDays =
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (spanDays > MAX_RANGE_DAYS) {
    return {
      error: `Período máximo de ${MAX_RANGE_DAYS} dias`,
      code: 'RANGE_TOO_LARGE',
      statusCode: 400,
    };
  }

  const days = enumerateDaysInclusive(fromStr, toStr);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const raw = await loadReportsRaw(userId, start, end);
  const data = await assembleFullReport(
    userId,
    fromStr,
    toStr,
    days,
    start,
    end,
    todayStart,
    raw
  );

  let comparison: ReportComparisonPayload | undefined;
  if (query.compare === 'previous') {
    const prevRange = previousPeriodSameLength(fromStr, toStr);
    const prevStart = parseYmdToLocalStart(prevRange.from);
    const prevEnd = parseYmdToLocalEnd(prevRange.to);
    const prevDays = enumerateDaysInclusive(prevRange.from, prevRange.to);
    const prevRaw = await loadReportsRaw(userId, prevStart, prevEnd);
    const previousAssembled = await assembleFullReport(
      userId,
      prevRange.from,
      prevRange.to,
      prevDays,
      prevStart,
      prevEnd,
      todayStart,
      prevRaw,
      { includeLedger: false }
    );
    comparison = buildReportComparison(
      data as ReportMetricsSlice,
      previousAssembled as ReportMetricsSlice
    );
  }

  const out =
    comparison !== undefined
      ? { ...(data as Record<string, unknown>), comparison }
      : data;

  return { data: out };
}
