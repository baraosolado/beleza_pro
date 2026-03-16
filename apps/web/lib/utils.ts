import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    const iso = date.split('T')[0];
    const [year, month, day] = iso.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatDateShort(date: Date | string): string {
  if (typeof date === 'string') {
    const iso = date.split('T')[0];
    const [year, month, day] = iso.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return format(d, 'dd/MM/yyyy');
  }
  return format(date, 'dd/MM/yyyy');
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm');
}
