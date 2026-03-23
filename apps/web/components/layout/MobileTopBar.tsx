'use client';

import { Menu } from 'lucide-react';

import { useMobileNav } from '@/components/layout/MobileNavContext';

export function MobileTopBar(): React.ReactElement {
  const { toggle } = useMobileNav();

  return (
    <header
      className="fixed left-0 right-0 top-0 z-[90] border-b border-border bg-app-surface/95 backdrop-blur-md lg:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex h-12 w-full items-center gap-2 px-3">
        <button
          type="button"
          onClick={toggle}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-primary transition-colors hover:bg-app-bg"
          aria-label="Abrir menu"
        >
          <Menu className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold tracking-tight text-ink-primary">Beleza Pro</p>
          <p className="truncate text-[10px] text-ink-muted">Gestão de estética</p>
        </div>
      </div>
    </header>
  );
}
