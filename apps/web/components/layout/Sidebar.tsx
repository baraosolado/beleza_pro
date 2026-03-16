'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Scissors,
  Settings,
  Users,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/schedule', label: 'Agenda', icon: CalendarDays },
  { href: '/services', label: 'Serviços', icon: Scissors },
  { href: '/charges', label: 'Cobranças', icon: CreditCard },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

type SidebarProps = {
  userName?: string;
  userPlan?: string;
  userAvatar?: string;
  className?: string;
};

export function Sidebar({
  userName = 'Usuário',
  userPlan = 'Trial',
  userAvatar,
  className,
}: SidebarProps): React.ReactElement {
  const pathname = usePathname();

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden w-[240px] shrink-0 flex-col bg-[#1a1744] lg:flex',
          className
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500 shadow-lg shadow-violet-500/30">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" fill="white" fillOpacity="0.9" />
              <path d="M9 5L13 7.5V12.5L9 15L5 12.5V7.5L9 5Z" fill="white" fillOpacity="0.3" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none text-white">Beleza Pro</p>
            <p className="mt-0.5 text-[11px] text-white/40">Gestão de Estética</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                  isActive
                    ? 'bg-violet-600 font-semibold text-white shadow-md shadow-violet-600/20'
                    : 'font-medium text-white/50 hover:bg-white/5 hover:text-white/80'
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/5 px-3 py-4">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="relative size-9 shrink-0">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-300">
                  {initials}
                </div>
              )}
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[#1a1744] bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="text-[11px] text-white/40">{userPlan}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white py-2 lg:hidden">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-all',
                isActive ? 'text-violet-600' : 'text-slate-400 hover:text-slate-700'
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

