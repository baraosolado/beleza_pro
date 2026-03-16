'use client';

import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
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
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all disabled:opacity-50';
  const variants = {
    primary:
      'bg-primary hover:bg-primary/90 text-white px-5 py-2.5 shadow-md shadow-primary/20',
    outline:
      'flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary rounded-xl hover:bg-primary/5',
    ghost: 'hover:bg-white/5 text-white/70 hover:text-white',
  };

  return (
    <button
      type={type}
      className={cn(base, variants[variant], className)}
      disabled={disabled ?? isLoading}
      {...props}
    >
      {isLoading ? 'Carregando...' : children}
    </button>
  );
}
