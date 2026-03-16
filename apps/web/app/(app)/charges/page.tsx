'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
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

const TAB_STATUS = [
  { key: '', label: 'Todas' },
  { key: 'paid', label: 'Recebido' },
  { key: 'pending', label: 'Pendente' },
  { key: 'overdue', label: 'Inadimplente' },
  { key: 'cancelled', label: 'Cancelado' },
] as const;

export default function ChargesPage() {
  const queryClient = useQueryClient();
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewChargeFormData>({
    resolver: zodResolver(newChargeSchema) as Resolver<NewChargeFormData>,
    defaultValues: {
      dueDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: NewChargeFormData) =>
      api.post('/charges', {
        clientId: body.clientId,
        amount: Number(body.amount),
        dueDate: body.dueDate,
        ...(body.description && { description: body.description }),
      }),
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
    queryKey: ['dashboard', 'financial', startDate, endDate],
    queryFn: () =>
      api
        .get<FinancialSummary>(
          `/dashboard/financial?startDate=${startDate}&endDate=${endDate}`
        )
        .then((r) => r.data),
  });

  const { data: chargesData, isLoading: chargesLoading } = useQuery({
    queryKey: ['charges', tab, startDate, endDate],
    queryFn: () =>
      api
        .get<{ items: ChargeItem[]; total: number }>(
          `/charges?status=${tab}&startDate=${startDate}&endDate=${endDate}&limit=50`
        )
        .then((r) => r.data),
  });

  const items = chargesData?.items ?? [];
  const total = chargesData?.total ?? 0;
  const tabCount =
    tab === ''
      ? total
      : tab === 'paid'
        ? items.length
        : tab === 'pending'
          ? items.length
          : tab === 'overdue'
            ? items.length
            : tab === 'cancelled'
              ? items.length
              : 0;

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
          ? 'scheduled'
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

  const isOverdue = (due: string, status: string) =>
    status === 'pending' && new Date(due) < new Date();

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
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Cliente
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-800"
              {...register('clientId')}
            >
              <option value="">Selecione</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.clientId && (
              <p className="mt-1 text-sm text-red-500">{errors.clientId.message}</p>
            )}
          </div>
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            error={errors.amount?.message}
            {...register('amount')}
          />
          <Input
            label="Vencimento"
            type="date"
            error={errors.dueDate?.message}
            {...register('dueDate')}
          />
          <Input
            label="Descrição (opcional)"
            error={errors.description?.message}
            {...register('description')}
          />
          {createError && (
            <p className="text-sm text-red-500">{createError}</p>
          )}
          <div className="flex gap-2 pt-2">
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
      </Modal>
      <main className="flex-1 overflow-auto p-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <input
            type="date"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-slate-400">até</span>
          <input
            type="date"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {financialLoading ? (
            <>
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </>
          ) : (
            <>
              <Card className="border-t-4 border-t-emerald-500 p-6">
                <p className="text-sm font-medium text-slate-500">
                  Recebido
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(financial?.received ?? 0)}
                </p>
              </Card>
              <Card className="border-t-4 border-t-amber-500 p-6">
                <p className="text-sm font-medium text-slate-500">
                  Pendente
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(financial?.pending ?? 0)}
                </p>
              </Card>
              <Card className="border-t-4 border-t-red-500 p-6">
                <p className="text-sm font-medium text-slate-500">
                  Inadimplente
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(financial?.overdue ?? 0)}
                </p>
              </Card>
            </>
          )}
        </div>

        <div className="mb-4 flex flex-wrap border-b border-slate-200">
          {TAB_STATUS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium transition-colors',
                tab === key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-600 hover:text-slate-800'
              )}
            >
              {label}
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {key === '' ? total : tab === key ? tabCount : 0}
              </span>
            </button>
          ))}
        </div>

        {toast && (
          <p className="mb-4 text-sm text-emerald-600">{toast}</p>
        )}

        <Card className="overflow-hidden p-0">
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Serviço</th>
                    <th className="px-6 py-4 font-medium">Valor</th>
                    <th className="px-6 py-4 font-medium">Vencimento</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      className={cn(
                        'border-b border-slate-100 hover:bg-slate-50',
                        c.status === 'overdue' && 'bg-red-50'
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
                          isOverdue(c.dueDate, c.status) && 'text-red-600'
                        )}
                      >
                        {formatDateShort(c.dueDate)}
                      </td>
                      <td className="px-6 py-4">
                        {statusBadge(c.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {c.status === 'pending' &&
                            (c.stripePixCopyPaste ? (
                              <Button
                                variant="outline"
                                type="button"
                                onClick={() =>
                                  copyPix(c.stripePixCopyPaste ?? undefined)
                                }
                              >
                                Copiar Pix
                              </Button>
                            ) : (
                              <Button variant="outline" type="button" disabled>
                                Copiar Pix
                              </Button>
                            ))}
                          <button
                            type="button"
                            className="rounded-full p-2 text-emerald-500 hover:bg-emerald-50"
                            aria-label="Enviar WhatsApp"
                          >
                            <MessageCircle className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
