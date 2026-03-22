'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Search,
} from 'lucide-react';

import { Button, Card, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';

const schema = z.object({
  clientId: z.string().min(1, 'Selecione o cliente'),
  serviceId: z.string().min(1, 'Selecione o serviço'),
  date: z.string().min(1, 'Informe a data'),
  time: z.string().min(1, 'Informe o horário'),
  sendConfirmation: z.boolean().optional(),
  notes: z.string().optional(),
});

export type NewAppointmentFormValues = z.infer<typeof schema>;

type ClientItem = { id: string; name: string; phone: string | null };
type ServiceItem = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
};

type NewAppointmentFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
  variant?: 'modal' | 'page';
  /** yyyy-mm-dd — ex.: dia focado na agenda */
  defaultDate?: string;
  /** Pré-seleciona cliente (ex.: URL /schedule/new?clientId=…) */
  prefillClientId?: string;
};

function toScheduledAtISO(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

function getAppointmentErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { error?: string } } }).response?.data
      ?.error;
    if (msg) return msg;
  }
  return 'Não foi possível agendar. Verifique os dados e tente novamente.';
}

const fieldShell =
  'h-12 w-full rounded-xl border border-border bg-app-bg px-4 text-sm text-ink-primary outline-none transition-all placeholder:text-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20';

export function NewAppointmentForm({
  onSuccess,
  onCancel,
  variant = 'page',
  defaultDate,
  prefillClientId,
}: NewAppointmentFormProps): JSX.Element {
  const queryClient = useQueryClient();
  const isModal = variant === 'modal';
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  const initialDate = useMemo(() => {
    if (defaultDate) return defaultDate;
    if (variant === 'page') return format(new Date(), 'yyyy-MM-dd');
    return '';
  }, [defaultDate, variant]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NewAppointmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: '',
      serviceId: '',
      sendConfirmation: true,
      date: initialDate,
      time: '',
    },
  });

  useEffect(() => {
    if (defaultDate) setValue('date', defaultDate);
  }, [defaultDate, setValue]);

  const { data: prefillClient } = useQuery({
    queryKey: ['clients', 'detail', prefillClientId],
    queryFn: () =>
      api
        .get<ClientItem>(`/clients/${prefillClientId}`)
        .then((r) => r.data),
    enabled: Boolean(prefillClientId),
  });

  useEffect(() => {
    if (!prefillClient) return;
    setValue('clientId', prefillClient.id);
    setClientSearch(prefillClient.name);
  }, [prefillClient, setValue]);

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'list', clientSearch],
    queryFn: () =>
      api
        .get<{ items: ClientItem[] }>(
          `/clients?search=${encodeURIComponent(clientSearch)}&limit=20`
        )
        .then((r) => r.data),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get<ServiceItem[] | { items: ServiceItem[] }>(
        '/services'
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d as { items: ServiceItem[] }).items ?? [];
    },
  });

  const clients = clientsData?.items ?? [];
  const services: ServiceItem[] = Array.isArray(servicesData)
    ? servicesData
    : [];

  const mutation = useMutation({
    mutationFn: (body: NewAppointmentFormValues) =>
      api.post('/appointments', {
        clientId: body.clientId,
        serviceId: body.serviceId,
        scheduledAt: toScheduledAtISO(body.date, body.time),
        sendConfirmation: body.sendConfirmation ?? true,
        notes: body.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const clientId = watch('clientId');
  const serviceId = watch('serviceId');
  const dateVal = watch('date');
  const timeVal = watch('time');

  const selectedClient = clientId
    ? clients.find((c) => c.id === clientId) ?? null
    : null;
  const selectedService = serviceId
    ? services.find((s) => s.id === serviceId) ?? null
    : null;

  const pickClient = useCallback(
    (c: ClientItem) => {
      setValue('clientId', c.id);
      setClientDropdownOpen(false);
      setClientSearch(c.name);
    },
    [setValue]
  );

  const onSubmit = async (data: NewAppointmentFormValues) => {
    try {
      await mutation.mutateAsync(data);
      reset({
        clientId: '',
        serviceId: '',
        sendConfirmation: true,
        date: defaultDate ?? (variant === 'page' ? format(new Date(), 'yyyy-MM-dd') : ''),
        time: '',
        notes: '',
      });
      setClientSearch('');
      onSuccess();
    } catch {
      /* mutation.onError não usado — Axios lança */
    }
  };

  const apiError = mutation.isError
    ? getAppointmentErrorMessage(mutation.error)
    : null;

  const clientBlock = (
    <div className={cn(isModal && 'space-y-2')}>
      {isModal ? (
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-primary">
          Cliente
        </label>
      ) : (
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Cliente</h3>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Buscar ou cadastrar cliente..."
          className={cn(fieldShell, 'pl-12')}
          value={clientSearch}
          onChange={(e) => {
            setClientSearch(e.target.value);
            setClientDropdownOpen(true);
            if (!e.target.value) setValue('clientId', '');
          }}
          onFocus={() => setClientDropdownOpen(true)}
        />
        {clientDropdownOpen && clients.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-app-surface py-1 shadow-lg">
            {clients.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-app-bg"
                  onClick={() => pickClient(c)}
                >
                  {c.name}
                  {c.phone ? ` · ${c.phone}` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selectedClient && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-light p-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-muted text-xs font-bold text-primary-hover">
            {selectedClient.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium text-ink-primary">
            {selectedClient.name}
            {selectedClient.phone ? ` · ${selectedClient.phone}` : ''}
          </span>
          <button
            type="button"
            className="shrink-0 text-ink-muted hover:text-ink-primary"
            onClick={() => {
              setValue('clientId', '');
              setClientSearch('');
            }}
            aria-label="Remover cliente"
          >
            ×
          </button>
        </div>
      )}
      {errors.clientId && (
        <p className="text-xs font-medium text-danger">{errors.clientId.message}</p>
      )}
    </div>
  );

  const serviceBlockModal = (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-ink-primary">
        Serviço
      </label>
      <div className="relative">
        <select
          className={cn(fieldShell, 'cursor-pointer appearance-none pr-11')}
          {...register('serviceId')}
        >
          <option value="">Selecione um serviço</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({formatCurrency(Number(s.price))} · {s.durationMin}min)
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
      </div>
      {errors.serviceId && (
        <p className="text-xs font-medium text-danger">{errors.serviceId.message}</p>
      )}
    </div>
  );

  const serviceBlockPage = (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Serviço</h3>
      <div className="grid grid-cols-2 gap-3">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setValue('serviceId', s.id)}
            className={cn(
              'rounded-xl border p-4 text-left transition-all',
              serviceId === s.id
                ? 'border-primary bg-primary-light'
                : 'border-border bg-white hover:border-slate-300'
            )}
          >
            <p className="font-semibold text-slate-800">{s.name}</p>
            <p className="text-sm text-slate-500">
              {s.durationMin} min · {formatCurrency(Number(s.price))}
            </p>
          </button>
        ))}
      </div>
      {errors.serviceId && (
        <p className="mt-1 text-sm text-red-500">{errors.serviceId.message}</p>
      )}
    </div>
  );

  const dateTimeBlockModal = (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-primary">
          Data
        </label>
        <div className="relative">
          <input type="date" className={cn(fieldShell, 'pr-11')} {...register('date')} />
          <Calendar className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
        </div>
        {errors.date && (
          <p className="text-xs font-medium text-danger">{errors.date.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-primary">
          Horário
        </label>
        <div className="relative">
          <input type="time" className={cn(fieldShell, 'pr-11')} {...register('time')} />
          <Clock className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
        </div>
        {errors.time && (
          <p className="text-xs font-medium text-danger">{errors.time.message}</p>
        )}
      </div>
    </div>
  );

  const dateTimeBlockPage = (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Data e horário</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Data"
          type="date"
          error={errors.date?.message}
          {...register('date')}
        />
        <Input
          label="Horário"
          type="time"
          error={errors.time?.message}
          {...register('time')}
        />
      </div>
    </div>
  );

  const optionsBlockPage = (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Opções</h3>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('sendConfirmation')} />
        <span className="text-sm text-slate-600">
          Enviar confirmação por WhatsApp
        </span>
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="checkbox"
          id="stripe-charge"
          disabled
          className="cursor-not-allowed"
        />
        <label htmlFor="stripe-charge" className="text-sm text-slate-600">
          Cobrança Pix (Stripe)
        </label>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Plano Pro
        </span>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-sm text-slate-600">Observações</label>
        <textarea
          className="w-full rounded-lg border border-border px-4 py-2.5 text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          rows={3}
          placeholder="Anotações do agendamento..."
          {...register('notes')}
        />
      </div>
    </div>
  );

  const notesBlockModal = (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-ink-primary">
        Observações (opcional)
      </label>
      <textarea
        className={cn(fieldShell, 'min-h-[100px] resize-none py-3')}
        rows={3}
        placeholder="Ex: Cliente prefere esmalte da marca X"
        {...register('notes')}
      />
      <label className="flex items-center gap-2 pt-1">
        <input type="checkbox" className="rounded border-border" {...register('sendConfirmation')} />
        <span className="text-sm text-ink-secondary">
          Enviar confirmação por WhatsApp
        </span>
      </label>
    </div>
  );

  /** Campo oculto: clientId vem do pickClient / setValue */
  const hiddenClientId = <input type="hidden" {...register('clientId')} />;

  if (isModal) {
    return (
      <form
        id="new-appointment-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex max-h-[min(90vh,640px)] flex-col overflow-hidden"
      >
        {hiddenClientId}
        <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-8 pb-6">
          {clientBlock}
          {serviceBlockModal}
          {dateTimeBlockModal}
          {notesBlockModal}
          {apiError && (
            <p className="text-sm font-medium text-danger">{apiError}</p>
          )}
        </div>
        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border/60 bg-app-bg/80 px-8 py-6">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-full px-6 text-sm font-semibold text-ink-secondary transition-colors hover:bg-app-bg"
          >
            Cancelar
          </button>
          <Button
            type="submit"
            isLoading={mutation.isPending}
            className="h-11 rounded-full border-0 bg-gradient-to-br from-primary to-primary-hover px-8 text-sm font-semibold text-white shadow-btn-primary hover:opacity-95 active:scale-[0.98]"
          >
            <Check className="mr-1.5 size-4" />
            Confirmar agendamento
          </Button>
        </footer>
      </form>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_340px]">
      <form
        id="new-appointment-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8"
      >
        {hiddenClientId}
        {clientBlock}
        {serviceBlockPage}
        {dateTimeBlockPage}
        {optionsBlockPage}
        {apiError && <p className="text-sm font-medium text-danger">{apiError}</p>}
      </form>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-slate-800">
            Resumo do agendamento
          </h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Cliente</dt>
              <dd className="font-medium text-slate-800">
                {selectedClient?.name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Serviço</dt>
              <dd className="font-medium text-slate-800">
                {selectedService?.name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Data</dt>
              <dd className="font-medium text-slate-800">
                {dateVal
                  ? new Date(dateVal + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Horário</dt>
              <dd className="font-medium text-slate-800">{timeVal || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Valor</dt>
              <dd className="text-base font-bold text-slate-800">
                {selectedService
                  ? formatCurrency(Number(selectedService.price))
                  : '—'}
              </dd>
            </div>
          </dl>
          <div className="mt-6 space-y-2">
            <Button
              type="submit"
              form="new-appointment-form"
              className="w-full"
              isLoading={mutation.isPending}
            >
              Agendar e enviar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
