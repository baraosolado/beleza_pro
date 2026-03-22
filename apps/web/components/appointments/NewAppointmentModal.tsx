'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

import { NewAppointmentForm } from '@/components/appointments/NewAppointmentForm';

type NewAppointmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** yyyy-mm-dd — pré-preenche a data (ex.: dia selecionado na agenda) */
  defaultDate?: string;
};

export function NewAppointmentModal({
  open,
  onOpenChange,
  defaultDate,
}: NewAppointmentModalProps) {
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-appointment-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar modal"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative z-10 flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-app-surface shadow-[0_12px_40px_rgba(15,15,18,0.06)]"
      >
        <div className="flex items-start justify-between px-8 pb-2 pt-8">
          <div>
            <h2
              id="new-appointment-modal-title"
              className="text-lg font-bold leading-tight text-ink-primary"
            >
              Novo agendamento
            </h2>
            <p className="mt-1 text-[13px] text-ink-secondary">
              Preencha os dados do compromisso
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="-mr-1 -mt-1 flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-app-bg"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>
        <NewAppointmentForm
          variant="modal"
          defaultDate={defaultDate}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </div>
    </div>
  );
}
