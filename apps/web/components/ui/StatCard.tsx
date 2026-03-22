'use client';

import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string | number;
  subtitle?: React.ReactNode;
  icon: LucideIcon;
  variant?: 'rose' | 'emerald' | 'amber';
  className?: string;
};

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'rose',
  className,
}: StatCardProps): React.ReactElement {
  const iconVariants = {
    rose: 'bg-primary-muted text-primary-hover',
    emerald: 'bg-success-light text-emerald-700',
    amber: 'bg-warning-light text-amber-800',
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-app-surface p-5 shadow-card transition-shadow duration-150 hover:shadow-card-hover',
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            iconVariants[variant]
          )}
        >
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="metric text-ink-primary">{value}</p>
      {subtitle ? (
        <div className="mt-2 text-xs font-medium text-success">{subtitle}</div>
      ) : null}
    </div>
  );
}
