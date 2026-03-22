'use client';

import { cn } from '@/lib/utils';

type BadgeProps = {
  variant?:
    | 'scheduled'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'warning'
    | 'default'
    | 'paid'
    | 'pending'
    | 'overdue';
  children: React.ReactNode;
  className?: string;
};

export function Badge({
  variant = 'default',
  children,
  className,
}: BadgeProps): React.ReactElement {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    scheduled: 'bg-primary-muted text-primary-hover',
    confirmed: 'bg-success-light text-emerald-800',
    paid: 'bg-success-light text-emerald-800',
    completed: 'bg-zinc-100 text-zinc-700',
    cancelled: 'bg-danger-light text-red-900',
    overdue: 'bg-danger-light text-red-900',
    warning: 'bg-warning-light text-amber-900',
    pending: 'bg-warning-light text-amber-900',
    default: 'bg-zinc-100 text-zinc-600',
  };
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2.5 text-xs font-semibold uppercase tracking-wide',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
