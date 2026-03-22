'use client';

import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-[13px] font-medium text-ink-primary"
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-9 w-full rounded-lg border border-border bg-app-surface px-3 text-sm text-ink-primary shadow-sm placeholder:text-ink-muted',
          'focus:border-border-focus focus:outline-none focus:ring-[3px] focus:ring-primary-light',
          error && 'border-danger focus:border-danger focus:ring-danger-light',
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger">{error}</p>
      ) : null}
    </div>
  );
});
