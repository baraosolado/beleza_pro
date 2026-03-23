'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';

import { appNavItems } from '@/components/layout/nav-config';
import { cn, avatarClassForInitial } from '@/lib/utils';

type SidebarProps = {
  userName?: string;
  userPlan?: string;
  userAvatar?: string;
  onLogout?: () => void;
  className?: string;
};

export function Sidebar({
  userName = 'Usuário',
  userPlan = 'Trial',
  userAvatar,
  onLogout,
  className,
}: SidebarProps): React.ReactElement {
  const pathname = usePathname();

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

  return (
    <aside
      className={cn(
        'hidden w-[248px] shrink-0 flex-col bg-sidebar-bg lg:flex',
        className
      )}
    >
      <div className="border-b border-sidebar-border px-4 py-5">
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
            {userAvatar ? (
              <img src={userAvatar} alt="" className="size-full rounded-full object-cover" />
            ) : (
              <div
                className={cn(
                  'flex size-full items-center justify-center rounded-full text-[11px] font-bold',
                  avatarClassForInitial(userName)
                )}
              >
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-white">{userName}</p>
            <p className="truncate text-[11px] text-white/45">{planDisplay}</p>
          </div>
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-sidebar-active hover:text-white"
              aria-label="Sair"
            >
              <LogOut className="size-[18px]" />
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
