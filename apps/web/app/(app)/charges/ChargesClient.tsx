'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, subMonths } from 'date-fns';
import { CreditCard } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { NewChargeModal } from '@/components/charges/NewChargeModal';
import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';

type ChargeItem = {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  description?: string | null;
  client: { name: string };
  appointment?: { service?: { name: string } } | null;
  stripePixCopyPaste?: string | null;
};

type FinancialSummary = {
  received: number;
  pending: number;
  overdue: number;
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

export function ChargesClient() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAmountParam = searchParams.get('amount');
  const initialDescriptionParam = searchParams.get('description');
  const initialProductIdParam = searchParams.get('productId');
  const initialAmount = initialAmountParam ? Number(initialAmountParam) : undefined;
  const initialDescription = initialDescriptionParam ?? undefined;
  const initialProductId = initialProductIdParam ?? undefined;
  const fromProduct = !!initialAmount || !!initialDescription || !!initialProductId;
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const chargePrefilled = useMemo(
    () => ({
      ...(initialAmount !== undefined ? { amount: initialAmount } : {}),
      ...(initialDescription ? { description: initialDescription } : {}),
      ...(initialProductId ? { productId: initialProductId } : {}),
    }),
    [initialAmount, initialDescription, initialProductId]
  );

  useEffect(() => {
    if (fromProduct) setModalOpen(true);
  }, [fromProduct]);

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
        ? 'paid'
        : status === 'pending'
          ? 'pending'
          : status === 'overdue'
            ? 'overdue'
            : status === 'cancelled'
              ? 'cancelled'
              : 'default';
    const label =
      status === 'paid'
        ? 'Pago'
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
        onAction={() => setModalOpen(true)}
      />
      <NewChargeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        prefilled={chargePrefilled}
        onCreated={() => {
          setToast('Cobrança criada.');
          setTimeout(() => setToast(null), 3000);
        }}
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {/* Filtro de período */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
            <span className="font-medium">Período:</span>
            <button
              type="button"
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                periodMode === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-600 border border-border'
              )}
              onClick={() => setPeriodMode('all')}
            >
              Todos
            </button>
            <input
              type="date"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
              }}
            />
            <span className="text-slate-400">até</span>
            <input
              type="date"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
        <div className="mb-0 flex flex-wrap border-b border-border bg-white px-4 rounded-t-xl">
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
            <div className="divide-y divide-border/60 p-6">
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
                  <tr className="border-b border-border bg-slate-50 text-left text-slate-600">
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
                <tbody className="divide-y divide-border/60">
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
                            {(c.description || c.appointment?.service?.name) && (
                              <p className="text-xs text-slate-500">
                                {c.description ?? c.appointment?.service?.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {c.description ?? c.appointment?.service?.name ?? '—'}
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
                            <div className="absolute right-0 z-10 mt-2 w-32 rounded-lg border border-border bg-white py-1 text-sm shadow-lg">
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
                  );
                })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
