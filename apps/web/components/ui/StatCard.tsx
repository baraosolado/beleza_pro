'use client';

import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string | number;
  subtitle?: React.ReactNode;
  icon: LucideIcon;
  variant?: 'violet' | 'emerald' | 'amber';
  className?: string;
};

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'violet',
  className,
}: StatCardProps): React.ReactElement {
  const iconVariants = {
    violet: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div
      className={cn(
        'bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-medium text-slate-500">{label}</span>
        <span
          className={cn(
            'flex items-center justify-center p-2 rounded-lg',
            iconVariants[variant]
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      {subtitle ? (
        <div className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-600">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
