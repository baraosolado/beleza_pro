'use client';

import { cn } from '@/lib/utils';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps): React.ReactElement {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-200', className)}
      aria-hidden
    />
  );
}
