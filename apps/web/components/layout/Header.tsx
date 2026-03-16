'use client';

import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type HeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function Header({
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
}: HeaderProps): React.ReactElement {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-xs font-medium text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notificações"
        >
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 size-2 rounded-full border-2 border-white bg-red-500" />
        </button>
        {actionLabel && onAction ? (
          <Button onClick={onAction} variant="primary">
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
