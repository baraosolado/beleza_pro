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
  className?: string;
};

export function Sidebar({
  userName = 'Usuário',
  userPlan = 'Trial',
  className,
}: SidebarProps): React.ReactElement {
  const pathname = usePathname();

  return (
    <>
      <aside
        className={cn(
          'hidden w-60 min-w-[240px] shrink-0 flex-col border-r border-white/10 bg-[#1E1B4B] lg:flex',
          className
        )}
      >
        <div className="border-b border-white/10 p-6">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Beleza Pro
          </h1>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4 custom-scrollbar">
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
                  'flex items-center gap-3 rounded-lg px-4 py-3 transition-all',
                  isActive
                    ? 'sidebar-item-active bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 shrink-0 rounded-full border-2 border-primary bg-slate-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {userName}
              </p>
              <p className="text-xs text-white/50">{userPlan}</p>
            </div>
          </div>
        </div>
      </aside>

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
                isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
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
