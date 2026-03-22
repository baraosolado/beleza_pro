import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}

/** Cores de avatar por faixa de inicial (design Rose Slate) */
export function avatarClassForInitial(name: string): string {
  const letter = (name.trim()[0] ?? 'A').toUpperCase();
  const code = letter.charCodeAt(0);
  if (code >= 65 && code <= 69) return 'bg-primary-muted text-primary-hover';
  if (code >= 70 && code <= 74) return 'bg-indigo-100 text-indigo-700';
  if (code >= 75 && code <= 79) return 'bg-success-light text-emerald-800';
  if (code >= 80 && code <= 84) return 'bg-warning-light text-amber-900';
  if (code >= 85 && code <= 90) return 'bg-[#FEF3C7] text-[#92400E]';
  return 'bg-[#F3E8FF] text-[#7C3AED]';
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

/** Ex: "Sábado, 15 de março de 2026" */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
}
