import type { ComponentType } from 'react';
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  FileText,
  Handshake,
  LayoutDashboard,
  Package,
  Scissors,
  Settings,
  Users,
} from 'lucide-react';

export type AppNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

/** Navegação principal (sidebar desktop + drawer mobile). */
export const appNavItems: AppNavItem[] = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/schedule', label: 'Agenda', icon: CalendarDays },
  { href: '/services', label: 'Serviços', icon: Scissors },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/charges', label: 'Cobranças', icon: CreditCard },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/consorcio', label: 'Consórcio', icon: Handshake },
  { href: '/send-invoice', label: 'Enviar Conta', icon: FileText },
  { href: '/settings', label: 'Configurações', icon: Settings },
];
