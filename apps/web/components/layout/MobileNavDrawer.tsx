'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, X } from 'lucide-react';
import { useEffect } from 'react';

import { appNavItems } from '@/components/layout/nav-config';
import { useMobileNav } from '@/components/layout/MobileNavContext';
import { cn, avatarClassForInitial } from '@/lib/utils';

type MobileNavDrawerProps = {
  userName?: string;
  userPlan?: string;
  onLogout?: () => void;
};

export function MobileNavDrawer({
  userName = 'Usuário',
  userPlan = 'Trial',
  onLogout,
}: MobileNavDrawerProps): React.ReactElement {
  const pathname = usePathname();
  const { open, setOpen } = useMobileNav();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const planDisplay =
    userPlan === 'Pro'
      ? 'Pro · Conta ativa'
      : userPlan === 'Trial'
        ? 'Trial · Conta'
        : `${userPlan} · Conta`;

  if (!open) return <></>;

  return (
    <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Fechar menu"
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          'absolute left-0 top-0 flex h-full w-[min(100%,300px)] max-w-full flex-col',
          'border-r border-sidebar-border bg-sidebar-bg shadow-2xl'
        )}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-btn-primary">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" fill="white" fillOpacity="0.95" />
                <path d="M9 5L13 7.5V12.5L9 15L5 12.5V7.5L9 5Z" fill="white" fillOpacity="0.35" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-bold leading-none text-white">Beleza Pro</p>
              <p className="mt-1 text-[11px] text-white/45">Gestão de Estética</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-sidebar-active hover:text-white"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {appNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'relative flex items-center gap-3 rounded-lg py-2.5 pl-4 pr-4 text-[14px] font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-white/55 hover:bg-sidebar-active hover:text-white/90'
                )}
              >
                {isActive ? (
                  <span
                    className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                    aria-hidden
                  />
                ) : null}
                <Icon className="size-[18px] shrink-0 opacity-90" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-4">
          <div className="flex items-center gap-3">
            <div className="size-8 shrink-0 rounded-full border-2 border-primary p-[2px]">
              <div
                className={cn(
                  'flex size-full items-center justify-center rounded-full text-[11px] font-bold text-white',
                  avatarClassForInitial(userName)
                )}
              >
                {initials}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-white">{userName}</p>
              <p className="truncate text-[11px] text-white/45">{planDisplay}</p>
            </div>
            {onLogout ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-sidebar-active hover:text-white"
                aria-label="Sair"
              >
                <LogOut className="size-[18px]" />
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
