'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

import { NewClientForm } from '@/components/clients/NewClientForm';

type NewClientModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewClientModal({ open, onOpenChange }: NewClientModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-client-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar modal"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[1.5rem] bg-app-surface shadow-2xl">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-6 top-6 z-10 flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-app-bg"
          aria-label="Fechar"
        >
          <X className="size-5" />
        </button>
        <div className="shrink-0 px-8 pb-4 pt-8">
          <h2
            id="new-client-modal-title"
            className="text-xl font-bold leading-tight text-ink-primary"
          >
            Nova Cliente
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Preencha as informações abaixo
          </p>
        </div>
        <NewClientForm
          variant="modal"
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </div>
    </div>
  );
}
