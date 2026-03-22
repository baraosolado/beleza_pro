'use client';

import { cn } from '@/lib/utils';

type CardProps = {
  children: React.ReactNode;
  className?: string;
  /** Sombra e borda ao hover (cards clicáveis) */
  interactive?: boolean;
};

export function Card({
  children,
  className,
  interactive = false,
}: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-app-surface p-5 shadow-card transition-all duration-150',
        interactive &&
          'cursor-pointer hover:border-primary/20 hover:shadow-card-hover',
        !interactive && 'hover:shadow-card',
        className
      )}
    >
      {children}
    </div>
  );
}
