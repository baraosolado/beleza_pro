'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button, Card, Input } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';

const schema = z.object({
  clientId: z.string().min(1, 'Selecione o cliente'),
  serviceId: z.string().min(1, 'Selecione o serviço'),
  scheduledAt: z.string().min(1, 'Data e hora obrigatórias'),
  sendConfirmation: z.boolean().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type ClientItem = { id: string; name: string; phone: string | null };
type ServiceItem = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
};

export default function NewAppointmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

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
    mutationFn: (body: FormData) =>
      api.post('/appointments', {
        clientId: body.clientId,
        serviceId: body.serviceId,
        scheduledAt: body.scheduledAt,
        sendConfirmation: body.sendConfirmation ?? true,
        notes: body.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setToast({ type: 'success', message: 'Agendamento criado.' });
      router.push('/schedule');
    },
    onError: (err: unknown) => {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erro ao agendar'
          : 'Erro ao agendar';
      setToast({ type: 'error', message });
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sendConfirmation: true },
  });

  const clientId = watch('clientId');
  const serviceId = watch('serviceId');
  const scheduledAt = watch('scheduledAt');
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

  return (
    <>
      <Header
        title="Novo agendamento"
        subtitle="Preencha os dados"
      />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_340px]">
          <form
            id="new-appointment-form"
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="space-y-8"
          >
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Cliente
              </h3>
              <div className="relative">
                <Input
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setClientDropdownOpen(true);
                    if (!e.target.value) setValue('clientId', '');
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                />
                {clientDropdownOpen && clients.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {clients.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => pickClient(c)}
                        >
                          {c.name}
                          {c.phone ? ` · ${c.phone}` : ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedClient && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {selectedClient.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="flex-1 font-medium">
                      {selectedClient.name}
                      {selectedClient.phone ? ` · ${selectedClient.phone}` : ''}
                    </span>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600"
                      onClick={() => {
                        setValue('clientId', '');
                        setClientSearch('');
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
                {errors.clientId && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.clientId.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Serviço
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setValue('serviceId', s.id)}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-all',
                      serviceId === s.id
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 bg-white hover:border-slate-300'
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
                <p className="mt-1 text-sm text-red-500">
                  {errors.serviceId.message}
                </p>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Data e horário
              </h3>
              <Input
                type="datetime-local"
                error={errors.scheduledAt?.message}
                {...register('scheduledAt')}
              />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Opções
              </h3>
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
                <label
                  htmlFor="stripe-charge"
                  className="text-sm text-slate-600"
                >
                  Cobrança Pix (Stripe)
                </label>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Plano Pro
                </span>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-sm text-slate-600">
                  Observações
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Anotações do agendamento..."
                  {...register('notes')}
                />
              </div>
            </div>

            {toast && (
              <p
                className={
                  toast.type === 'error'
                    ? 'text-sm text-red-500'
                    : 'text-sm text-emerald-600'
                }
              >
                {toast.message}
              </p>
            )}
          </form>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-bold text-slate-800">
                Resumo do Agendamento
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
                    {scheduledAt
                      ? new Date(scheduledAt).toLocaleDateString('pt-BR')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Horário</dt>
                  <dd className="font-medium text-slate-800">
                    {scheduledAt
                      ? new Date(scheduledAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Valor</dt>
                  <dd className="font-bold text-slate-800">
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
                  Agendar e Enviar
                </Button>
                <Link href="/schedule" className="block">
                  <Button type="button" variant="ghost" className="w-full">
                    Apenas Agendar
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
