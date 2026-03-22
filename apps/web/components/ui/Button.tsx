'use client';

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger-ghost';
  isLoading?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

export function Button({
  className,
  variant = 'primary',
  isLoading,
  disabled,
  type = 'button',
  children,
  ...props
}: ButtonProps): React.ReactElement {
  const base =
    'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40';
  const variants = {
    primary:
      'bg-primary text-white shadow-btn-primary hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2',
    secondary:
      'border border-border bg-app-surface text-ink-primary hover:bg-primary-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light',
    outline:
      'border border-border bg-app-surface text-ink-primary hover:border-primary/30 hover:bg-primary-light/40',
    ghost:
      'bg-transparent text-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light',
    'danger-ghost':
      'bg-transparent text-danger hover:bg-danger-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-light',
  };

  return (
    <button
      type={type}
      className={cn(base, variants[variant], className)}
      disabled={disabled ?? isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2
            className={cn(
              'size-4 shrink-0 animate-spin',
              variant === 'primary' ? 'text-white' : 'text-ink-secondary'
            )}
            aria-hidden
          />
          <span>Carregando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
