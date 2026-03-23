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
        'sticky top-0 z-30 flex min-h-[52px] shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-app-surface px-4 py-2 sm:min-h-[60px] sm:px-6 sm:py-0 lg:px-8',
        className
      )}
    >
      <div className="min-w-0 flex-1 basis-[min(100%,12rem)] sm:basis-auto">
        {breadcrumb ? (
          <p className="mb-0.5 text-xs text-ink-muted">{breadcrumb}</p>
        ) : null}
        <h1 className="text-base font-bold tracking-tight text-ink-primary sm:text-header-title">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-secondary sm:text-sm">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          className="relative hidden rounded-lg p-2 text-ink-secondary transition-colors hover:bg-primary-light hover:text-ink-primary sm:block"
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
            'hidden size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white sm:flex',
            displayName ? avatarClassForInitial(displayName) : 'bg-primary-muted text-primary-hover'
          )}
          title={displayName || 'Usuário'}
        >
          {initials || '—'}
        </div>
        {actionLabel && onAction ? (
          <Button
            onClick={onAction}
            variant="primary"
            className="max-w-[min(100%,11rem)] shrink-0 truncate px-3 text-xs sm:max-w-none sm:px-4 sm:text-sm"
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
