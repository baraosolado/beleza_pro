import { Card } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

import {
  APPOINTMENT_STATUS_LABEL,
  CHARGE_STATUS_LABEL,
  pct,
} from './reports.labels';
import type { ReportsApiResponse } from './reports.types';
import { KeyValueList, StatCard } from './reports-widgets';

type Props = { data: ReportsApiResponse };

export function ReportSectionsBody({ data }: Props): React.ReactElement {
  const cmp = data.comparison?.kpis;
  const appointmentRows = Object.entries(data.periodMetrics.appointmentsByStatus).map(
    ([k, v]) => ({
      key: k,
      label: APPOINTMENT_STATUS_LABEL[k] ?? k,
      value: v,
    })
  );

  const chargeCreatedRows = Object.entries(data.periodMetrics.chargesCreatedByStatus).map(
    ([k, v]) => ({
      key: k,
      label: CHARGE_STATUS_LABEL[k] ?? k,
      value: v,
    })
  );

  return (
    <>
      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Indicadores do período
        </h3>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 xl:grid-cols-6 lg:overflow-visible lg:pb-0">
          <StatCard
            className="min-w-[158px] shrink-0 snap-start lg:min-w-0"
            title="Novos clientes"
            value={String(data.periodMetrics.clientsNew)}
            deltaVsPrevious={cmp?.clientsNew.deltaPct}
          />
          <StatCard
            className="min-w-[158px] shrink-0 snap-start lg:min-w-0"
            title="Agendamentos"
            value={String(data.periodMetrics.appointmentsTotal)}
            deltaVsPrevious={cmp?.appointmentsTotal.deltaPct}
          />
          <StatCard
            className="min-w-[158px] shrink-0 snap-start lg:min-w-0"
            title="Total recebido"
            value={formatCurrency(data.periodMetrics.chargesPaidInPeriodSum)}
            deltaVsPrevious={cmp?.chargesPaidInPeriodSum.deltaPct}
          />
          <StatCard
            className="min-w-[158px] shrink-0 snap-start lg:min-w-0"
            title="Cobranças criadas"
            value={String(data.periodMetrics.chargesCreatedCount)}
            deltaVsPrevious={cmp?.chargesCreatedCount.deltaPct}
          />
          <StatCard
            className="min-w-[158px] shrink-0 snap-start lg:min-w-0"
            title="WhatsApp (msgs)"
            value={String(data.periodMetrics.whatsappMessagesTotal)}
            deltaVsPrevious={cmp?.whatsappMessagesTotal.deltaPct}
          />
          <StatCard
            className="min-w-[158px] shrink-0 snap-start lg:min-w-0"
            title="Sorteios (consórcio)"
            value={String(data.periodMetrics.consorcioDrawsCount)}
            deltaVsPrevious={cmp?.consorcioDrawsCount.deltaPct}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            title="Pagamentos (qtd)"
            value={String(data.periodMetrics.chargesPaidInPeriodCount)}
            deltaVsPrevious={cmp?.chargesPaidInPeriodCount.deltaPct}
          />
          <StatCard
            title="Valor cobranças criadas"
            value={formatCurrency(data.periodMetrics.chargesCreatedTotalAmount)}
            deltaVsPrevious={cmp?.chargesCreatedTotalAmount.deltaPct}
          />
          <StatCard
            title="Taxa lembrete enviado"
            value={pct(data.periodMetrics.reminderSentRateAmongScheduledConfirmed)}
            hint="Agendados/confirmados no período"
          />
          <StatCard
            title="Taxa não compareceu"
            value={pct(data.periodMetrics.noShowRateAmongCompletedOrNoShow)}
            hint="Concluídos + não compareceu no período"
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Visão geral (cadastro)
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatCard title="Clientes" value={String(data.snapshot.clientsTotal)} />
          <StatCard title="Serviços" value={String(data.snapshot.servicesTotal)} />
          <StatCard title="Serviços ativos" value={String(data.snapshot.servicesActive)} />
          <StatCard title="Produtos" value={String(data.snapshot.productsTotal)} />
          <StatCard
            title="Categorias de produto"
            value={String(data.snapshot.productCategoriesCount)}
          />
          <StatCard
            title="Consórcio — participantes"
            value={String(data.snapshot.consorcioParticipantsTotal)}
          />
          <StatCard title="Consórcio — PDFs" value={String(data.snapshot.consorcioPdfsTotal)} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-50">
            Agenda — status no período
          </h3>
          <KeyValueList
            items={appointmentRows.map((r) => ({
              key: r.key,
              label: r.label,
              value: r.value,
            }))}
          />
        </Card>
        <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-50">
            Cobranças criadas no período (por status)
          </h3>
          <KeyValueList
            items={chargeCreatedRows.map((r) => ({
              key: r.key,
              label: r.label,
              value: r.value,
            }))}
          />
        </Card>
        <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-50">
            Financeiro — recebido no período
          </h3>
          <KeyValueList
            items={[
              {
                key: 'paidCount',
                label: 'Pagamentos contabilizados',
                value: data.periodMetrics.chargesPaidInPeriodCount,
              },
              {
                key: 'paidSum',
                label: 'Total recebido',
                value: data.periodMetrics.chargesPaidInPeriodSum,
                format: 'money',
              },
              {
                key: 'createdSum',
                label: 'Soma valor cobranças criadas',
                value: data.periodMetrics.chargesCreatedTotalAmount,
                format: 'money',
              },
            ]}
          />
        </Card>
        <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-50">
            Cobranças em aberto (hoje)
          </h3>
          <KeyValueList
            items={[
              {
                key: 'pCount',
                label: 'Pendentes (quantidade)',
                value: data.periodMetrics.chargesOpenPendingCount,
              },
              {
                key: 'pSum',
                label: 'Pendentes (valor)',
                value: data.periodMetrics.chargesOpenPendingSum,
                format: 'money',
              },
              {
                key: 'oCount',
                label: 'Vencidas (quantidade)',
                value: data.periodMetrics.chargesOpenOverdueCount,
              },
              {
                key: 'oSum',
                label: 'Vencidas (valor)',
                value: data.periodMetrics.chargesOpenOverdueSum,
                format: 'money',
              },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
