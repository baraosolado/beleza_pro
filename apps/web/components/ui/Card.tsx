'use client';

import { cn } from '@/lib/utils';

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}
