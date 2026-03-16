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
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      ) : null}
    </div>
  );
});
