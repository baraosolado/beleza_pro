'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, subMonths } from 'date-fns';
import { CreditCard, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Badge, Button, Card, Input, Modal, Skeleton } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';

const newChargeSchema = z.object({
  clientId: z.string().uuid('Selecione um cliente'),
  amount: z.coerce.number().min(0.01, 'Valor inválido'),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  description: z.string().optional(),
});

type NewChargeFormData = z.infer<typeof newChargeSchema>;

type ChargeItem = {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  client: { name: string };
  appointment?: { service?: { name: string } } | null;
  stripePixCopyPaste?: string | null;
};

type FinancialSummary = {
  received: number;
  pending: number;
  overdue: number;
};

type ServiceItem = {
  id: string;
  name: string;
  price: number;
};

function getEffectiveStatus(item: ChargeItem): string {
  const due = new Date(item.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (item.status === 'pending' && due < today) {
    return 'overdue';
  }

  return item.status;
}

const TAB_STATUS = [
  { key: '', label: 'Todas' },
  { key: 'paid', label: 'Recebido' },
  { key: 'pending', label: 'Pendente' },
  { key: 'overdue', label: 'Inadimplente' },
  { key: 'cancelled', label: 'Cancelado' },
] as const;

export default function ChargesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [periodMode, setPeriodMode] = useState<'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState(() =>
    format(subMonths(new Date(), 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd')
  );
  const [tab, setTab] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash'>('pix');
  const [generatePixNow, setGeneratePixNow] = useState(true);
  const [sendWhatsappReminder, setSendWhatsappReminder] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () =>
      api
        .get<{ id: string; name: string }[] | { items: { id: string; name: string }[] }>(
          '/clients'
        )
        .then((r) => r.data),
  });
  const clients = Array.isArray(clientsData)
    ? clientsData
    : (clientsData as { items?: { id: string; name: string }[] })?.items ?? [];

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<NewChargeFormData>({
    resolver: zodResolver(newChargeSchema) as Resolver<NewChargeFormData>,
    defaultValues: {
      dueDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

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
  });
  const services: ServiceItem[] = servicesData ?? [];

  const createMutation = useMutation({
    mutationFn: (body: NewChargeFormData) => {
      const selectedService = selectedServiceId
        ? services.find((s) => s.id === selectedServiceId) ?? null
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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'financial'] });
      reset();
      setModalOpen(false);
      setCreateError(null);
      setToast('Cobrança criada.');
      setTimeout(() => setToast(null), 3000);
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

  const { data: financial, isLoading: financialLoading } = useQuery({
    queryKey: ['dashboard', 'financial', periodMode, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (periodMode === 'custom') {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
      const qs = params.toString();
      const url = qs
        ? `/dashboard/financial?${qs}`
        : '/dashboard/financial';
      return api.get<FinancialSummary>(url).then((r) => r.data);
    },
  });

  const { data: chargesData, isLoading: chargesLoading } = useQuery({
    queryKey: ['charges', tab, periodMode, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: '50',
      });

      if (periodMode === 'custom') {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }

      // Só envia status quando uma aba específica estiver selecionada
      if (tab) {
        params.set('status', tab);
      }

      return api
        .get<{ items: ChargeItem[]; total: number }>(`/charges?${params.toString()}`)
        .then((r) => r.data);
    },
  });

  const items = chargesData?.items ?? [];
  const total = chargesData?.total ?? 0;

  const statusCounts = items.reduce(
    (acc, c) => {
      const status = getEffectiveStatus(c);
      acc.all += 1;
      if (status === 'paid') acc.paid += 1;
      if (status === 'pending') acc.pending += 1;
      if (status === 'overdue') acc.overdue += 1;
      if (status === 'cancelled') acc.cancelled += 1;
      return acc;
    },
    { all: 0, paid: 0, pending: 0, overdue: 0, cancelled: 0 }
  );

  const copyPix = async (copyPaste: string | undefined) => {
    if (!copyPaste) return;
    try {
      await navigator.clipboard.writeText(copyPaste);
      setToast('Copiado!');
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast('Erro ao copiar');
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/charges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'financial'] });
      setToast('Cobrança excluída.');
      setTimeout(() => setToast(null), 3000);
      setMenuOpenId(null);
    },
  });

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function statusBadge(status: string): React.ReactNode {
    const v =
      status === 'paid'
        ? 'confirmed'
        : status === 'pending'
          ? 'warning'
          : status === 'overdue'
            ? 'cancelled'
            : 'default';
    const label =
      status === 'paid'
        ? 'Recebido'
        : status === 'pending'
          ? 'Pendente'
          : status === 'overdue'
            ? 'Inadimplente'
            : status === 'cancelled'
              ? 'Cancelado'
              : status;
    return <Badge variant={v}>{label}</Badge>;
  }

  const isOverdue = (item: ChargeItem) => getEffectiveStatus(item) === 'overdue';

  return (
    <>
      <Header
        title="Cobranças"
        subtitle="Pix e pagamentos"
        actionLabel="Nova Cobrança"
        onAction={() => {
          setCreateError(null);
          setModalOpen(true);
        }}
      />
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova cobrança"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-6"
          >
          {/* Cliente */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Cliente
            </label>
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
              {/* campo real usado pelo react-hook-form */}
              <input type="hidden" {...register('clientId')} />
              {clientDropdownOpen && filteredClients.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {filteredClients.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
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
            {errors.clientId && (
              <p className="text-sm text-red-500">{errors.clientId.message}</p>
            )}
          </div>

          {/* Detalhes da cobrança */}
          <div className="space-y-5">
            <h3 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              Detalhes da cobrança
            </h3>

            {/* Serviço prestado */}
            {services.length > 0 && (
              <div className="space-y-2">
                <span className="block text-sm font-semibold text-slate-700">
                  Serviço Prestado
                </span>
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedServiceId(s.id);
                        setValue('amount', Number(s.price), {
                          shouldValidate: true,
                        });
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-semibold',
                        selectedServiceId === s.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Valor
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    {...register('amount')}
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Data de vencimento
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    {...register('dueDate')}
                  />
                </div>
                {errors.dueDate && (
                  <p className="text-sm text-red-500">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pagamento e notificações (apenas UI, sem lógica de backend) */}
          <div className="space-y-5">
            <h3 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              Pagamento e notificações
            </h3>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Meio de recebimento
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-bold',
                    paymentMethod === 'pix'
                      ? 'border-2 border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                  onClick={() => setPaymentMethod('pix')}
                >
                  <span className="text-2xl">▢▢</span>
                  <span>Pix</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-bold',
                    paymentMethod === 'card'
                      ? 'border-2 border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                  onClick={() => setPaymentMethod('card')}
                >
                  <span className="text-2xl">💳</span>
                  <span>Cartão</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-bold',
                    paymentMethod === 'cash'
                      ? 'border-2 border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <span className="text-2xl">💵</span>
                  <span>Dinheiro</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex cursor-pointer items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700">
                    Gerar QR Code Pix agora
                  </span>
                  <span className="text-xs text-slate-500">
                    O código será exibido após a criação
                  </span>
                </div>
                <button
                  type="button"
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 transition-colors',
                    generatePixNow && 'bg-primary'
                  )}
                  onClick={() => setGeneratePixNow((v) => !v)}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform',
                      generatePixNow && 'translate-x-5'
                    )}
                  />
                </button>
              </label>

              <label className="flex cursor-pointer items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700">
                    Enviar lembrete via WhatsApp
                  </span>
                  <span className="text-xs text-slate-500">
                    Notifica o cliente automaticamente
                  </span>
                </div>
                <button
                  type="button"
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 transition-colors',
                    sendWhatsappReminder && 'bg-primary'
                  )}
                  onClick={() => setSendWhatsappReminder((v) => !v)}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform',
                      sendWhatsappReminder && 'translate-x-5'
                    )}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* Observações (mapeia para description) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Observações (interno)
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
              rows={3}
              placeholder="Ex: Cliente solicitou parcelamento em 2x..."
              {...register('description')}
            />
          </div>

            {createError && (
              <p className="text-sm text-red-500">{createError}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                Criar cobrança
              </Button>
            </div>
          </form>
        </div>
      </Modal>
      <main className="flex-1 overflow-auto p-8">
        {/* Filtro de período */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
            <span className="font-medium">Período:</span>
            <button
              type="button"
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                periodMode === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              )}
              onClick={() => setPeriodMode('all')}
            >
              Todos
            </button>
            <input
              type="date"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
              }}
            />
            <span className="text-slate-400">até</span>
            <input
              type="date"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
              }}
            />

            <button
              type="button"
              className="ml-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
              onClick={() => setPeriodMode('custom')}
            >
              Filtrar
            </button>
          </div>
        </div>

        {/* Métricas de resumo */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          {financialLoading ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : (
            <>
              <div className="flex items-start justify-between rounded-xl border-t-4 border-emerald-500 bg-white p-6 shadow-sm">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">Recebido</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(financial?.received ?? 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-start justify-between rounded-xl border-t-4 border-amber-500 bg-white p-6 shadow-sm">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">Pendente</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(financial?.pending ?? 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-start justify-between rounded-xl border-t-4 border-red-500 bg-white p-6 shadow-sm">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">
                    Inadimplente
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(financial?.overdue ?? 0)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Abas de status */}
        <div className="mb-0 flex flex-wrap border-b border-slate-200 bg-white px-4 rounded-t-xl">
          {TAB_STATUS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center px-4 py-4 text-sm font-medium transition-colors',
                tab === key
                  ? 'border-b-2 border-primary text-primary font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {label}
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {key === ''
                  ? statusCounts.all
                  : key === 'paid'
                    ? statusCounts.paid
                    : key === 'pending'
                      ? statusCounts.pending
                      : key === 'overdue'
                        ? statusCounts.overdue
                        : statusCounts.cancelled}
              </span>
            </button>
          ))}
        </div>

        {toast && (
          <p className="mb-4 text-sm text-emerald-600">{toast}</p>
        )}

        <Card className="overflow-hidden rounded-t-none border-t-0 p-0">
          {chargesLoading ? (
            <div className="divide-y divide-slate-100 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="mb-4 h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CreditCard className="size-12 text-slate-300" />
              <p className="mt-2 font-medium text-slate-600">
                Nenhuma cobrança no período
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Serviço
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Vencimento
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Pix
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((c) => {
                    const effectiveStatus = getEffectiveStatus(c);
                    return (
                    <tr
                      key={c.id}
                      className={cn(
                        'hover:bg-slate-50',
                        effectiveStatus === 'overdue' && 'bg-red-50/70',
                        effectiveStatus === 'pending' && 'bg-amber-50/70',
                        effectiveStatus === 'paid' && 'bg-emerald-50/70',
                        effectiveStatus === 'cancelled' && 'bg-slate-50'
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {getInitials(c.client.name)}
                          </span>
                          <div>
                            <Link
                              href={`/charges/${c.id}`}
                              className="font-bold text-slate-800 hover:text-primary hover:underline"
                            >
                              {c.client.name}
                            </Link>
                            {c.appointment?.service?.name && (
                              <p className="text-xs text-slate-500">
                                {c.appointment.service.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {c.appointment?.service?.name ?? '—'}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {formatCurrency(Number(c.amount))}
                      </td>
                      <td
                        className={cn(
                          'px-6 py-4 font-medium',
                          isOverdue(c) && 'text-red-600'
                        )}
                      >
                        {formatDateShort(c.dueDate)}
                      </td>
                      <td className="px-6 py-4">
                        {statusBadge(effectiveStatus)}
                      </td>
                      <td className="px-6 py-4">
                        {effectiveStatus === 'pending' && c.stripePixCopyPaste ? (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80"
                            onClick={() =>
                              copyPix(c.stripePixCopyPaste ?? undefined)
                            }
                          >
                            Copiar Pix
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            className="rounded-full p-2 text-slate-400 hover:text-slate-600"
                            aria-label="Mais ações"
                            onClick={() =>
                              setMenuOpenId((current) =>
                                current === c.id ? null : c.id
                              )
                            }
                          >
                            •••
                          </button>
                          {menuOpenId === c.id && (
                            <div className="absolute right-0 z-10 mt-2 w-32 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                                onClick={() => router.push(`/charges/${c.id}`)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                                onClick={() => deleteMutation.mutate(c.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
