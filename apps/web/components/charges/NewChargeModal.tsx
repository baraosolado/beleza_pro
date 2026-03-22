'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar,
  ChevronDown,
  Scissors,
  Sparkles,
  User,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const newChargeSchema = z.object({
  clientId: z.string().uuid('Selecione um cliente'),
  amount: z.coerce.number().min(0.01, 'Valor inválido'),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  description: z.string().optional(),
  productId: z.string().uuid().optional(),
});

type NewChargeFormData = z.infer<typeof newChargeSchema>;

type ServiceItem = {
  id: string;
  name: string;
  price: number;
};

export type NewChargePrefilled = {
  amount?: number;
  description?: string;
  productId?: string;
};

type NewChargeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilled?: NewChargePrefilled;
  onCreated?: () => void;
};

const fieldClass =
  'w-full rounded-xl border border-border bg-app-surface py-2.5 text-sm text-ink-primary outline-none transition-all placeholder:text-ink-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20';

export function NewChargeModal({
  open,
  onOpenChange,
  prefilled,
  onCreated,
}: NewChargeModalProps) {
  const queryClient = useQueryClient();
  const [createError, setCreateError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash'>(
    'pix'
  );
  const [generatePixNow, setGeneratePixNow] = useState(true);
  const [sendWhatsappReminder, setSendWhatsappReminder] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewChargeFormData>({
    resolver: zodResolver(newChargeSchema) as Resolver<NewChargeFormData>,
    defaultValues: {
      clientId: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () =>
      api
        .get<
          { id: string; name: string }[] | { items: { id: string; name: string }[] }
        >('/clients')
        .then((r) => r.data),
    enabled: open,
  });
  const clients = Array.isArray(clientsData)
    ? clientsData
    : (clientsData as { items?: { id: string; name: string }[] })?.items ?? [];

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get<ServiceItem[] | { items: ServiceItem[] }>(
        '/services'
      );
      const d = res.data;
      return Array.isArray(d)
        ? d
        : ((d as { items?: ServiceItem[] }).items ?? []);
    },
    enabled: open,
  });
  const services: ServiceItem[] = servicesData ?? [];

  useEffect(() => {
    if (!open) return;
    if (prefilled?.amount !== undefined)
      setValue('amount', prefilled.amount, { shouldValidate: true });
    if (prefilled?.description)
      setValue('description', prefilled.description);
    if (prefilled?.productId) setValue('productId', prefilled.productId);
  }, [open, prefilled, setValue]);

  useEffect(() => {
    if (!open) {
      reset({
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        amount: undefined,
        description: undefined,
        clientId: '',
        productId: undefined,
      });
      setClientSearch('');
      setSelectedServiceId(null);
      setCreateError(null);
      setPaymentMethod('pix');
      setGeneratePixNow(true);
      setSendWhatsappReminder(true);
      setClientDropdownOpen(false);
    }
  }, [open, reset]);

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

  const createMutation = useMutation({
    mutationFn: (body: NewChargeFormData) => {
      const selectedService = selectedServiceId
        ? (services.find((s) => s.id === selectedServiceId) ?? null)
        : null;
      const description =
        body.description && body.description.trim().length > 0
          ? body.description
          : selectedService?.name;

      return api.post('/charges', {
        clientId: body.clientId,
        amount: Number(body.amount),
        dueDate: body.dueDate,
        ...(description && { description }),
        ...(body.productId && { productId: body.productId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'financial'] });
      onCreated?.();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erro ao criar cobrança'
          : 'Erro ao criar cobrança';
      setCreateError(message);
    },
  });

  const clientId = watch('clientId');
  const selectedClient = clientId
    ? clients.find((c) => c.id === clientId)
    : undefined;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-charge-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar modal"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-app-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-8 pb-0 pt-8">
          <div className="mb-1 flex items-start justify-between">
            <h2
              id="new-charge-modal-title"
              className="text-[22px] font-bold leading-tight text-ink-primary"
            >
              Nova cobrança
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-mr-1 -mt-1 rounded-full p-1 text-ink-muted transition-colors hover:bg-app-bg"
              aria-label="Fechar"
            >
              <X className="size-6" />
            </button>
          </div>
          <p className="text-sm text-ink-secondary">
            Selecione o cliente e os detalhes do pagamento
          </p>
        </div>

        <form
          onSubmit={handleSubmit((data) => {
            setCreateError(null);
            createMutation.mutate(data);
          })}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-8 py-8">
            {/* Cliente */}
            <div className="space-y-2">
              <label className="block text-[13px] font-semibold text-ink-secondary">
                Cliente
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  className={cn(fieldClass, 'pl-10 pr-4')}
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setClientDropdownOpen(true);
                    if (!e.target.value)
                      setValue('clientId', '', { shouldValidate: false });
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                />
                <input type="hidden" {...register('clientId')} />
                <input type="hidden" {...register('productId')} />
                {clientDropdownOpen && filteredClients.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-app-surface py-1 shadow-lg">
                    {filteredClients.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-app-bg"
                          onClick={() => {
                            setValue('clientId', c.id, { shouldValidate: true });
                            setClientSearch(c.name);
                            setClientDropdownOpen(false);
                          }}
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedClient && (
                <p className="text-xs font-medium text-primary">
                  Selecionado: {selectedClient.name}
                </p>
              )}
              {errors.clientId && (
                <p className="text-xs font-medium text-danger">
                  {errors.clientId.message}
                </p>
              )}
            </div>

            {/* Serviço */}
            {services.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-ink-secondary">
                  Serviço realizado
                </label>
                <div className="relative">
                  <Scissors className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
                  <select
                    className={cn(
                      fieldClass,
                      'cursor-pointer appearance-none pl-10 pr-10 text-ink-secondary'
                    )}
                    value={selectedServiceId ?? ''}
                    onChange={(e) => {
                      const id = e.target.value || null;
                      setSelectedServiceId(id);
                      const s = id
                        ? services.find((x) => x.id === id) ?? null
                        : null;
                      if (s) {
                        setValue('amount', Number(s.price), {
                          shouldValidate: true,
                        });
                      }
                    }}
                  >
                    <option value="">Selecione o serviço</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
                </div>
              </div>
            )}

            {/* Valor + vencimento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-ink-secondary">
                  Valor da cobrança
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-muted">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={cn(
                      fieldClass,
                      'pl-10 pr-4 text-base font-bold text-ink-primary'
                    )}
                    {...register('amount')}
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs font-medium text-danger">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-ink-secondary">
                  Data de vencimento
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="date"
                    className={cn(fieldClass, 'pl-10 pr-4 text-ink-secondary')}
                    {...register('dueDate')}
                  />
                </div>
                {errors.dueDate && (
                  <p className="text-xs font-medium text-danger">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Forma de pagamento — segmentado */}
            <div className="space-y-3">
              <label className="block text-[13px] font-semibold text-ink-secondary">
                Forma de pagamento
              </label>
              <div className="flex rounded-xl bg-app-bg p-1">
                {(
                  [
                    { id: 'pix' as const, label: 'Pix' },
                    { id: 'card' as const, label: 'Cartão' },
                    { id: 'cash' as const, label: 'Dinheiro' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      'flex-1 rounded-lg py-2 text-xs font-bold transition-all',
                      paymentMethod === id
                        ? 'bg-primary text-white shadow-sm'
                        : 'font-medium text-ink-secondary hover:bg-app-surface'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opções (UI — backend futuro) */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-app-bg/50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Opções
              </p>
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink-primary">
                  Gerar QR Code Pix agora
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={generatePixNow}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-zinc-200 transition-colors',
                    generatePixNow && 'bg-primary'
                  )}
                  onClick={() => setGeneratePixNow((v) => !v)}
                >
                  <span
                    className={cn(
                      'inline-block size-5 translate-x-1 rounded-full bg-white shadow transition-transform',
                      generatePixNow && 'translate-x-5'
                    )}
                  />
                </button>
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink-primary">
                  Enviar lembrete via WhatsApp
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sendWhatsappReminder}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-zinc-200 transition-colors',
                    sendWhatsappReminder && 'bg-primary'
                  )}
                  onClick={() => setSendWhatsappReminder((v) => !v)}
                >
                  <span
                    className={cn(
                      'inline-block size-5 translate-x-1 rounded-full bg-white shadow transition-transform',
                      sendWhatsappReminder && 'translate-x-5'
                    )}
                  />
                </button>
              </label>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <label className="block text-[13px] font-semibold text-ink-secondary">
                Observações (opcional)
              </label>
              <textarea
                className={cn(fieldClass, 'min-h-[88px] resize-none px-4 py-3')}
                rows={3}
                placeholder="Ex: Cliente solicitou parcelamento em 2x..."
                {...register('description')}
              />
            </div>

            {createError && (
              <p className="text-sm font-medium text-danger">{createError}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-4 px-8 pb-8 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              isLoading={createMutation.isPending}
              className="gap-2 rounded-xl border-0 bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-btn-primary hover:bg-primary-hover active:scale-[0.98]"
            >
              <Sparkles className="size-[18px]" />
              Emitir cobrança
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
