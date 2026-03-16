'use client';

import { cn } from '@/lib/utils';

type BadgeProps = {
  variant?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'warning' | 'default';
  children: React.ReactNode;
  className?: string;
};

export function Badge({
  variant = 'default',
  children,
  className,
}: BadgeProps): React.ReactElement {
  const variants = {
    scheduled: 'bg-primary/10 text-primary',
    confirmed: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-slate-100 text-slate-700',
    cancelled: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    default: 'bg-slate-100 text-slate-700',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 text-xs font-bold uppercase rounded-full',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
