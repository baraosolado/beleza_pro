'use client';

import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { avatarClassForInitial, cn } from '@/lib/utils';

type HeaderProps = {
  title: string;
  /** Linha acima do título (ex.: breadcrumb) */
  breadcrumb?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function Header({
  title,
  breadcrumb,
  subtitle,
  actionLabel,
  onAction,
  className,
}: HeaderProps): React.ReactElement {
  const { user } = useAuth();
  const displayName = user?.name ?? '';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-app-surface px-8',
        className
      )}
    >
      <div className="min-w-0">
        {breadcrumb ? (
          <p className="mb-0.5 text-xs text-ink-muted">{breadcrumb}</p>
        ) : null}
        <h1 className="text-header-title text-ink-primary tracking-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-ink-secondary">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative rounded-lg p-2 text-ink-secondary transition-colors hover:bg-primary-light hover:text-ink-primary"
          aria-label="Notificações"
        >
          <Bell className="size-5" />
          <span
            className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger ring-2 ring-white"
            aria-hidden
          />
        </button>
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
            displayName ? avatarClassForInitial(displayName) : 'bg-primary-muted text-primary-hover'
          )}
          title={displayName || 'Usuário'}
        >
          {initials || '—'}
        </div>
        {actionLabel && onAction ? (
          <Button onClick={onAction} variant="primary" className="shrink-0">
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
