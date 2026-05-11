import { Card } from '@/components/ui';
import { cn, formatCurrency } from '@/lib/utils';

function formatDeltaPct(deltaPct: number | null | undefined): string {
  if (deltaPct === null || deltaPct === undefined) return '—';
  const rounded = Math.round(deltaPct * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

export function StatCard(props: {
  title: string;
  value: string;
  hint?: string;
  className?: string;
  deltaVsPrevious?: number | null;
  deltaInverted?: boolean;
}): React.ReactElement {
  const d = props.deltaVsPrevious;
  const upGood = !props.deltaInverted;
  const colored =
    d === null
      ? 'text-slate-400'
      : d === undefined
        ? ''
        : d === 0
          ? 'text-slate-500'
          : (d > 0) === upGood
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400';
  return (
    <Card
      className={cn(
        'border border-border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900',
        props.className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {props.title}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
        {props.value}
      </p>
      {d !== undefined ? (
        <p className={cn('mt-1 text-xs font-medium tabular-nums', colored)}>
          vs período anterior: {formatDeltaPct(d)}
        </p>
      ) : null}
      {props.hint ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{props.hint}</p>
      ) : null}
    </Card>
  );
}

export function KeyValueList(props: {
  items: Array<{ key: string; label: string; value: number; format?: 'money' }>;
}): React.ReactElement {
  return (
    <ul className="space-y-2 text-sm">
      {props.items.map((row) => (
        <li
          key={row.key}
          className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0 dark:border-slate-800"
        >
          <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
          <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {row.format === 'money' ? formatCurrency(row.value) : row.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MiniBars(props: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  max: number;
  valueSuffix?: string;
}): React.ReactElement {
  const max = props.max > 0 ? props.max : 1;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {props.title}
      </p>
      <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
        {props.rows.map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="truncate pr-2">{row.label}</span>
              <span className="shrink-0 tabular-nums font-medium">
                {props.valueSuffix === 'money'
                  ? formatCurrency(row.value)
                  : row.value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{ width: `${Math.min(100, (row.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
