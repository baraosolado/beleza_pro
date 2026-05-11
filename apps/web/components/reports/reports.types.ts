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

export type ReportsApiResponse = {
  period: { from: string; to: string };
  snapshot: {
    clientsTotal: number;
    servicesTotal: number;
    servicesActive: number;
    productsTotal: number;
    productCategoriesCount: number;
    consorcioParticipantsTotal: number;
    consorcioPdfsTotal: number;
  };
  periodMetrics: {
    clientsNew: number;
    appointmentsTotal: number;
    appointmentsByStatus: Record<string, number>;
    reminderSentRateAmongScheduledConfirmed: number;
    noShowRateAmongCompletedOrNoShow: number;
    chargesCreatedCount: number;
    chargesCreatedByStatus: Record<string, number>;
    chargesCreatedTotalAmount: number;
    chargesPaidInPeriodCount: number;
    chargesPaidInPeriodSum: number;
    chargesOpenPendingCount: number;
    chargesOpenPendingSum: number;
    chargesOpenOverdueCount: number;
    chargesOpenOverdueSum: number;
    whatsappMessagesTotal: number;
    whatsappByType: Record<string, number>;
    whatsappByStatus: Record<string, number>;
    whatsappSuccessRate: number;
    consorcioDrawsCount: number;
    notificationsLogCount: number;
  };
  products: {
    lowStockCount: number;
    inventoryRetailValue: number;
    inventoryCostValue: number;
  };
  consorcio: {
    participantsByStatus: Record<string, number>;
  };
  rankings: {
    topClientsByAppointments: Array<{
      clientId: string;
      name: string;
      appointments: number;
    }>;
    topClientsByPaidCharges: Array<{
      clientId: string;
      name: string;
      totalPaid: number;
    }>;
    topServicesByAppointments: Array<{
      serviceId: string;
      name: string;
      appointments: number;
    }>;
  };
  timeseries: {
    appointmentsByDay: Array<{ date: string; count: number }>;
    chargesPaidAmountByDay: Array<{ date: string; amount: number }>;
    whatsappMessagesByDay: Array<{ date: string; count: number }>;
  };
  charts: {
    maxAppointmentsPerDay: number;
    maxPaidPerDay: number;
    maxWhatsappPerDay: number;
  };
  ledger: ReportLedgerRow[];
  comparison?: ReportComparisonPayload;
};
