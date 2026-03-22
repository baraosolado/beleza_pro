'use client';

import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: ModalProps): React.ReactElement {
  if (!open) return <></>;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={cn(
          'w-full max-w-md rounded-xl border border-border bg-app-surface p-5 shadow-card-hover',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="modal-title"
          className="mb-4 text-base font-bold tracking-tight text-ink-primary"
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
