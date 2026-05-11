import { Card } from '@/components/ui';

import {
  CONSORCIO_STATUS_LABEL,
  pct,
  WA_STATUS_LABEL,
  WA_TYPE_LABEL,
} from './reports.labels';
import type { ReportsApiResponse } from './reports.types';
import { KeyValueList, MiniBars } from './reports-widgets';

type Props = { data: ReportsApiResponse };

export function ReportSectionsFooter({ data }: Props): React.ReactElement {
  const waTypeRows = Object.entries(data.periodMetrics.whatsappByType).map(([k, v]) => ({
    key: k,
    label: WA_TYPE_LABEL[k] ?? k,
    value: v,
  }));

  const waStatusRows = Object.entries(data.periodMetrics.whatsappByStatus).map(([k, v]) => ({
    key: k,
    label: WA_STATUS_LABEL[k] ?? k,
    value: v,
  }));

  const consorcioRows = Object.entries(data.consorcio.participantsByStatus).map(([k, v]) => ({
    key: k,
    label: CONSORCIO_STATUS_LABEL[k] ?? k,
    value: v,
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-50">
            WhatsApp — por tipo
          </h3>
          <KeyValueList
            items={waTypeRows.map((r) => ({
              key: r.key,
              label: r.label,
              value: r.value,
            }))}
          />
        </Card>
        <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-50">
            WhatsApp — por status
          </h3>
          <KeyValueList
            items={waStatusRows.map((r) => ({
              key: r.key,
              label: r.label,
              value: r.value,
            }))}
          />
          <p className="mt-3 text-xs text-slate-500">
            Taxa de envio com sucesso:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {pct(data.periodMetrics.whatsappSuccessRate)}
            </span>
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-50">
            Produtos e estoque
          </h3>
          <KeyValueList
            items={[
              {
                key: 'low',
                label: 'Itens com estoque baixo (alerta)',
                value: data.products.lowStockCount,
              },
              {
                key: 'retail',
                label: 'Valor de venda em estoque (qtd × preço)',
                value: data.products.inventoryRetailValue,
                format: 'money',
              },
              {
                key: 'cost',
                label: 'Custo em estoque (qtd × custo, se houver)',
                value: data.products.inventoryCostValue,
                format: 'money',
              },
            ]}
          />
        </Card>
        <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-50">
            Consórcio — participantes por status
          </h3>
          <KeyValueList
            items={consorcioRows.map((r) => ({
              key: r.key,
              label: r.label,
              value: r.value,
            }))}
          />
        </Card>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Rankings no período
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
            <MiniBars
              title="Top clientes — agendamentos"
              rows={data.rankings.topClientsByAppointments.map((c) => ({
                label: c.name,
                value: c.appointments,
              }))}
              max={Math.max(
                1,
                ...data.rankings.topClientsByAppointments.map((c) => c.appointments)
              )}
            />
          </Card>
          <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
            <MiniBars
              title="Top clientes — total pago (período)"
              rows={data.rankings.topClientsByPaidCharges.map((c) => ({
                label: c.name,
                value: c.totalPaid,
              }))}
              max={Math.max(
                1,
                ...data.rankings.topClientsByPaidCharges.map((c) => c.totalPaid)
              )}
              valueSuffix="money"
            />
          </Card>
          <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
            <MiniBars
              title="Top serviços — agendamentos"
              rows={data.rankings.topServicesByAppointments.map((s) => ({
                label: s.name,
                value: s.appointments,
              }))}
              max={Math.max(
                1,
                ...data.rankings.topServicesByAppointments.map((s) => s.appointments)
              )}
            />
          </Card>
        </div>
      </section>

    </>
  );
}
