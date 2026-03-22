'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Lightbulb, Scissors } from 'lucide-react';

import { Button, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z
  .object({
    name: z.string().min(1, 'Nome obrigatório'),
    phone: z.string().min(1, 'Telefone obrigatório'),
    email: z.string().email('E-mail inválido').optional().or(z.literal('')),
    notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
    scheduleFirst: z.boolean().optional(),
    firstServiceId: z.string().optional(),
    firstDate: z.string().optional(),
    firstTime: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.scheduleFirst) return true;
      return !!(data.firstServiceId && data.firstDate && data.firstTime);
    },
    { message: 'Preencha serviço, data e horário', path: ['firstServiceId'] }
  );

export type NewClientFormValues = z.infer<typeof schema>;

type ServiceItem = { id: string; name: string };

type NewClientFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
  /** modal: corpo com scroll + rodapé fixo | page: card único como página */
  variant?: 'modal' | 'page';
};

export function NewClientForm({
  onSuccess,
  onCancel,
  variant = 'page',
}: NewClientFormProps): React.ReactElement {
  const queryClient = useQueryClient();
  const isModal = variant === 'modal';

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () =>
      api.get<ServiceItem[] | { items: ServiceItem[] }>('/services').then((r) => r.data),
  });
  const services = Array.isArray(servicesData)
    ? servicesData
    : (servicesData as { items?: ServiceItem[] })?.items ?? [];

  const createClient = useMutation({
    mutationFn: (body: NewClientFormValues) =>
      api.post<{ id: string }>('/clients', {
        name: body.name,
        phone: body.phone.startsWith('+')
          ? body.phone
          : `+55${body.phone.replace(/\D/g, '')}`,
        email: body.email || undefined,
        notes: body.notes || undefined,
      }),
  });

  const createAppointment = useMutation({
    mutationFn: (payload: {
      clientId: string;
      serviceId: string;
      scheduledAt: string;
    }) => api.post('/appointments', payload),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<NewClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { scheduleFirst: true },
  });

  const scheduleFirst = watch('scheduleFirst');
  const notesValue = watch('notes') ?? '';
  const isPending = createClient.isPending || createAppointment.isPending;

  const onSubmit = async (data: NewClientFormValues) => {
    try {
      const res = await createClient.mutateAsync(data);
      const clientId = res.data?.id;
      if (!clientId) return;

      queryClient.invalidateQueries({ queryKey: ['clients'] });

      if (
        data.scheduleFirst &&
        data.firstServiceId &&
        data.firstDate &&
        data.firstTime
      ) {
        const [y, m, d] = data.firstDate.split('-').map(Number);
        const [hh, mm] = data.firstTime.split(':').map(Number);
        const scheduledAt = new Date(y, m - 1, d, hh, mm).toISOString();
        await createAppointment.mutateAsync({
          clientId,
          serviceId: data.firstServiceId,
          scheduledAt,
        });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }

      reset({ scheduleFirst: true });
      onSuccess();
    } catch {
      /* mutation error */
    }
  };

  const apiError =
    createClient.error || createAppointment.error
      ? 'Não foi possível salvar. Verifique os dados e tente novamente.'
      : null;

  const sectionTitle =
    'text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-5';
  const labelClass = 'block text-[13px] font-semibold text-ink-primary mb-1.5';
  const inputClass = cn(
    'w-full rounded-lg border border-border bg-app-surface px-3.5 py-2.5 text-sm text-ink-primary',
    'placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-light'
  );

  const fields = (
    <>
      <section>
        <h3 className={sectionTitle}>Informações pessoais</h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nome completo *</label>
            <input
              type="text"
              placeholder="Ex: Maria Oliveira"
              className={cn(
                inputClass,
                errors.name && 'border-danger focus:ring-danger-light'
              )}
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1 text-xs font-medium text-danger">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Telefone *</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-app-bg px-4 text-sm font-semibold text-ink-secondary">
                +55
              </span>
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                className={cn(
                  'min-w-0 flex-1 rounded-r-lg border border-border bg-app-surface px-3.5 py-2.5 text-sm',
                  'focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-light',
                  errors.phone && 'border-danger'
                )}
                {...register('phone')}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-xs font-medium text-danger">
                {errors.phone.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input
              type="email"
              placeholder="cliente@email.com"
              className={cn(
                inputClass,
                errors.email && 'border-danger focus:ring-danger-light'
              )}
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs font-medium text-danger">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>Observações</h3>
        <div className="relative">
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Alergias, preferências de esmalte, observações..."
            className={cn(inputClass, 'resize-none')}
            {...register('notes')}
          />
          <span className="absolute bottom-3 right-3 text-[10px] font-semibold text-ink-muted">
            {notesValue.length}/500
          </span>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Primeiro agendamento
          </h3>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              {...register('scheduleFirst')}
            />
            <div className="relative h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
        </div>
        {scheduleFirst && (
          <div className="space-y-4 rounded-2xl border border-border/60 bg-app-bg p-5">
            <p className="mb-1 text-sm font-semibold text-ink-primary">
              Agendar primeiro atendimento agora
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-ink-muted">
                  Serviço
                </label>
                <div className="relative">
                  <Scissors className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" />
                  <select
                    className={cn(
                      'w-full appearance-none rounded-lg border border-border bg-app-surface py-2.5 pl-10 pr-10 text-sm text-ink-primary',
                      'focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-light',
                      errors.firstServiceId && 'border-danger'
                    )}
                    {...register('firstServiceId')}
                  >
                    <option value="">Selecione um serviço</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.firstServiceId && (
                  <p className="mt-1 text-xs font-medium text-danger">
                    {errors.firstServiceId.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  label="Data"
                  type="date"
                  error={errors.firstDate?.message}
                  {...register('firstDate')}
                />
              </div>
              <div>
                <Input
                  label="Horário"
                  type="time"
                  error={errors.firstTime?.message}
                  {...register('firstTime')}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );

  const footer = (
    <>
      {apiError && (
        <p className="mb-2 text-sm font-medium text-danger">{apiError}</p>
      )}
      <div className="flex w-full items-center justify-between">
        <Button type="button" variant="ghost" className="text-ink-secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="new-client-form"
          isLoading={isPending}
          className="gap-2 shadow-btn-primary"
        >
          <Check className="size-[18px]" />
          Salvar cliente
        </Button>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-light p-4">
        <Lightbulb className="size-5 shrink-0 text-primary" />
        <p className="text-[13px] font-semibold leading-relaxed text-primary-hover">
          Após salvar, você pode enviar uma mensagem de boas-vindas pelo WhatsApp
          automaticamente.
        </p>
      </div>
    </>
  );

  if (isModal) {
    return (
      <form
        id="new-client-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex max-h-[min(90vh,720px)] flex-col overflow-hidden"
      >
        <div className="no-scrollbar flex-1 space-y-8 overflow-y-auto px-8 pb-4 pt-0">
          {fields}
        </div>
        <footer className="flex shrink-0 flex-col gap-4 border-t border-border bg-[#FAFAFA] px-8 py-5">
          {footer}
        </footer>
      </form>
    );
  }

  return (
    <form id="new-client-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="mx-auto max-w-[640px] overflow-hidden rounded-xl border border-border bg-app-surface shadow-card">
        <div className="space-y-8 p-6">{fields}</div>
        {apiError && (
          <p className="px-6 text-sm font-medium text-danger">{apiError}</p>
        )}
        <footer className="flex flex-col gap-4 border-t border-border bg-[#FAFAFA] px-6 py-5">
          {footer}
        </footer>
      </div>
    </form>
  );
}
