'use client';

import { Card } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

import { APPOINTMENT_STATUS_LABEL } from './reports.labels';
import type { ReportDomainId } from './reports.domains';
import type { ReportsApiResponse } from './reports.types';

const CHART_COLORS = [
  'rgb(59 130 246)',
  'rgb(16 185 129)',
  'rgb(245 158 11)',
  'rgb(239 68 68)',
  'rgb(139 92 246)',
  'rgb(236 72 153)',
];

type Props = {
  data: ReportsApiResponse;
  activeDomains: ReportDomainId[] | null;
};

function domainAllows(
  active: ReportDomainId[] | null,
  needed: ReportDomainId[]
): boolean {
  if (!active?.length) return true;
  return needed.some((n) => active.includes(n));
}

function linePoints(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padY: number,
  maxV: number
): string {
  if (values.length === 0) return '';
  const cap = Math.max(1e-6, maxV);
  const n = values.length;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  return values
    .map((v, i) => {
      const x = padX + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = padY + innerH - (v / cap) * innerH;
      return `${x},${y}`;
    })
    .join(' ');
}

export function ReportChartsGrid(props: Props): React.ReactElement {
  const { data, activeDomains } = props;
  const paid = data.timeseries.chargesPaidAmountByDay.map((x) => x.amount);
  const prevPaid =
    data.comparison?.timeseries.chargesPaidAmountByDay.map((x) => x.amount) ?? [];
  const alignedPrev =
    data.comparison && prevPaid.length
      ? prevPaid.slice(0, paid.length)
      : [];
  const maxPaid = Math.max(1e-6, ...paid, ...alignedPrev);

  const appts = data.timeseries.appointmentsByDay.map((x) => x.count);
  const maxAppt = Math.max(1, ...appts, 1);

  const wa = data.timeseries.whatsappMessagesByDay.map((x) => x.count);
  const maxWa = Math.max(1, ...wa, 1);

  const statusEntries = Object.entries(data.periodMetrics.appointmentsByStatus);
  const statusTotal = statusEntries.reduce((s, [, v]) => s + v, 0) || 1;

  const W = 360;
  const H = 160;
  const padX = 8;
  const padY = 14;

  const showRevenue = domainAllows(activeDomains, ['vendas', 'financeiro']);
  const showAgenda = domainAllows(activeDomains, ['agenda']);
  const showWa = domainAllows(activeDomains, ['comunicacao']);

  return (
    <section>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Gráficos
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {showRevenue ? (
          <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">
              Recebido por dia (cobranças pagas)
            </h4>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-44 w-full"
              preserveAspectRatio="none"
              role="img"
              aria-label="Gráfico de linha do valor recebido por dia"
            >
              <line
                x1={padX}
                y1={H - padY}
                x2={W - padX}
                y2={H - padY}
                className="stroke-slate-200 dark:stroke-slate-700"
                strokeWidth={1}
              />
              <polyline
                fill="none"
                className="stroke-primary"
                strokeWidth={2}
                points={linePoints(paid, W, H, padX, padY, maxPaid)}
              />
              {alignedPrev.length > 0 ? (
                <polyline
                  fill="none"
                  className="stroke-slate-400 dark:stroke-slate-500"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  points={linePoints(alignedPrev, W, H, padX, padY, maxPaid)}
                />
              ) : null}
            </svg>
            <p className="mt-1 text-xs text-slate-500">
              Máx. diário: {formatCurrency(maxPaid)}
              {alignedPrev.length > 0 ? (
                <span className="ml-2">
                  Linha tracejada: período anterior (mesma duração)
                </span>
              ) : null}
            </p>
          </Card>
        ) : null}

        {showAgenda ? (
          <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">
              Agendamentos por dia
            </h4>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-44 w-full"
              preserveAspectRatio="none"
              role="img"
              aria-label="Gráfico de barras de agendamentos por dia"
            >
              {appts.map((c, i) => {
                const barW = Math.max(1, (W - padX * 2) / appts.length - 1);
                const x = padX + i * ((W - padX * 2) / Math.max(1, appts.length));
                const h = (c / maxAppt) * (H - padY * 2);
                const y = H - padY - h;
                return (
                  <rect
                    key={data.timeseries.appointmentsByDay[i]?.date ?? i}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(0, h)}
                    className="fill-primary/75"
                    rx={1}
                  />
                );
              })}
            </svg>
          </Card>
        ) : null}

        {showAgenda ? (
          <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">
              Agendamentos no período — por status
            </h4>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <svg viewBox="0 0 120 120" className="mx-auto h-36 w-36 shrink-0" role="img">
                {(() => {
                  let angle = -90;
                  const cx = 60;
                  const cy = 60;
                  const r = 44;
                  const inner = 26;
                  return statusEntries.map(([key, val], idx) => {
                    const slice = (val / statusTotal) * 360;
                    const start = angle;
                    angle += slice;
                    const rad1 = ((start - 90) * Math.PI) / 180;
                    const rad2 = ((start + slice - 90) * Math.PI) / 180;
                    const x1 = cx + r * Math.cos(rad1);
                    const y1 = cy + r * Math.sin(rad1);
                    const x2 = cx + r * Math.cos(rad2);
                    const y2 = cy + r * Math.sin(rad2);
                    const large = slice > 180 ? 1 : 0;
                    const x1i = cx + inner * Math.cos(rad2);
                    const y1i = cy + inner * Math.sin(rad2);
                    const x2i = cx + inner * Math.cos(rad1);
                    const y2i = cy + inner * Math.sin(rad1);
                    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x1i} ${y1i} A ${inner} ${inner} 0 ${large} 0 ${x2i} ${y2i} Z`;
                    const color = CHART_COLORS[idx % CHART_COLORS.length];
                    return <path key={key} d={d} fill={color} stroke="white" strokeWidth={1} />;
                  });
                })()}
              </svg>
              <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
                {statusEntries.map(([key, val], idx) => {
                  const pct = Math.round((val / statusTotal) * 1000) / 10;
                  return (
                    <li key={key} className="flex justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span
                          className="h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        {APPOINTMENT_STATUS_LABEL[key] ?? key}
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {val} ({pct}%)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        ) : null}

        {showWa ? (
          <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">
              Mensagens WhatsApp por dia
            </h4>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-44 w-full"
              preserveAspectRatio="none"
              role="img"
              aria-label="Gráfico de área de mensagens por dia"
            >
              <defs>
                <linearGradient id="waFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {(() => {
                const pts = linePoints(wa, W, H, padX, padY, maxWa);
                const firstX = padX;
                const lastX = W - padX;
                const baseY = H - padY;
                const d = `M ${firstX} ${baseY} L ${pts.replace(/ /g, ' L ')} L ${lastX} ${baseY} Z`;
                return <path d={d} fill="url(#waFill)" />;
              })()}
              <polyline
                fill="none"
                className="stroke-primary"
                strokeWidth={2}
                points={linePoints(wa, W, H, padX, padY, maxWa)}
              />
            </svg>
            <p className="mt-1 text-xs text-slate-500">Pico diário: {maxWa} mensagens</p>
          </Card>
        ) : null}

        <Card className="border border-dashed border-border p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <h4 className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-50">
            Performance técnica (P95, uptime)
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Métricas de infraestrutura não se aplicam a esta conta. Foco do Beleza Pro: agenda,
            clientes, cobranças e WhatsApp.
          </p>
        </Card>
      </div>
    </section>
  );
}
