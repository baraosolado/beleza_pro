export type ReportMetricsSlice = {
  period: { from: string; to: string };
  periodMetrics: {
    clientsNew: number;
    appointmentsTotal: number;
    chargesPaidInPeriodSum: number;
    chargesPaidInPeriodCount: number;
    chargesCreatedCount: number;
    chargesCreatedTotalAmount: number;
    whatsappMessagesTotal: number;
    consorcioDrawsCount: number;
  };
  timeseries: {
    chargesPaidAmountByDay: Array<{ date: string; amount: number }>;
  };
};

export type ReportComparisonKpi = {
  current: number;
  previous: number;
  deltaPct: number | null;
};

export type ReportComparisonPayload = {
  period: { from: string; to: string };
  kpis: {
    clientsNew: ReportComparisonKpi;
    appointmentsTotal: ReportComparisonKpi;
    chargesPaidInPeriodSum: ReportComparisonKpi;
    chargesPaidInPeriodCount: ReportComparisonKpi;
    chargesCreatedCount: ReportComparisonKpi;
    chargesCreatedTotalAmount: ReportComparisonKpi;
    whatsappMessagesTotal: ReportComparisonKpi;
    consorcioDrawsCount: ReportComparisonKpi;
  };
  timeseries: {
    chargesPaidAmountByDay: Array<{ date: string; amount: number }>;
  };
};

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

function kpi(current: number, previous: number): ReportComparisonKpi {
  return { current, previous, deltaPct: deltaPct(current, previous) };
}

export function buildReportComparison(
  current: ReportMetricsSlice,
  previous: ReportMetricsSlice
): ReportComparisonPayload {
  const pmC = current.periodMetrics;
  const pmP = previous.periodMetrics;
  return {
    period: previous.period,
    kpis: {
      clientsNew: kpi(pmC.clientsNew, pmP.clientsNew),
      appointmentsTotal: kpi(pmC.appointmentsTotal, pmP.appointmentsTotal),
      chargesPaidInPeriodSum: kpi(pmC.chargesPaidInPeriodSum, pmP.chargesPaidInPeriodSum),
      chargesPaidInPeriodCount: kpi(
        pmC.chargesPaidInPeriodCount,
        pmP.chargesPaidInPeriodCount
      ),
      chargesCreatedCount: kpi(pmC.chargesCreatedCount, pmP.chargesCreatedCount),
      chargesCreatedTotalAmount: kpi(
        pmC.chargesCreatedTotalAmount,
        pmP.chargesCreatedTotalAmount
      ),
      whatsappMessagesTotal: kpi(pmC.whatsappMessagesTotal, pmP.whatsappMessagesTotal),
      consorcioDrawsCount: kpi(pmC.consorcioDrawsCount, pmP.consorcioDrawsCount),
    },
    timeseries: {
      chargesPaidAmountByDay: previous.timeseries.chargesPaidAmountByDay,
    },
  };
}
