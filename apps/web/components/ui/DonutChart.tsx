'use client';

import { cn } from '@/lib/utils';

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
  className?: string;
};

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  className,
}: DonutChartProps): React.ReactElement {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let acc = 0;
  const gradientParts = segments
    .map((seg) => {
      const pct = total > 0 ? (seg.value / total) * 100 : 0;
      const start = acc;
      acc += pct;
      return `${seg.color} ${start}% ${acc}%`;
    })
    .join(', ');

  return (
    <div className={cn('w-full', className)}>
      <div className="relative mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-full">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${gradientParts})`,
          }}
        />
        <div className="absolute inset-0 bg-white/20 rounded-full" />
        <div className="relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {centerLabel}
          </span>
          <span className="text-lg font-bold text-slate-800">{centerValue}</span>
        </div>
      </div>
      <div className="mt-8 w-full space-y-4">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-sm font-medium text-slate-600">
                {seg.label}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-800">
              {seg.value.toLocaleString('pt-BR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
