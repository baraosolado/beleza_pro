'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge, Button, Card, Input, Skeleton } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { formatCurrency, formatDateShort } from '@/lib/utils';

type ChargeDetail = {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  description: string | null;
  stripePixCopyPaste: string | null;
  client: { id: string; name: string; phone: string };
  appointment: { id: string; service: { name: string } } | null;
};

export default function ChargeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<string>('pending');

  const { data: charge, isLoading } = useQuery({
    queryKey: ['charges', id],
    queryFn: () => api.get<ChargeDetail>(`/charges/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const copyPix = async () => {
    if (!charge?.stripePixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(charge.stripePixCopyPaste);
      setToast('Pix copiado!');
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast('Erro ao copiar');
    }
  };

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

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      api.put(`/charges/${id}`, {
        amount: Number(amount),
        dueDate,
        description: description || undefined,
        status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['charges', id] });
      setToast('Cobrança atualizada.');
      setTimeout(() => setToast(null), 3000);
    },
  });

  if (isLoading || !charge) {
    return (
      <>
        <Header title="Cobrança" subtitle="Detalhe" />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </>
    );
  }

  if (amount === '' && dueDate === '') {
    setAmount(String(charge.amount));
    setDueDate(charge.dueDate.split('T')[0]);
    setDescription(charge.description ?? '');
    setStatus(charge.status);
  }

  const isOverdue =
    charge.status === 'pending' && new Date(charge.dueDate) < new Date();

  return (
    <>
      <Header title="Cobrança" subtitle={formatCurrency(Number(charge.amount))} />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link
            href="/charges"
            className="inline-block text-sm font-medium text-slate-600 hover:text-primary"
          >
            ← Voltar às cobranças
          </Link>

          <Card className="p-6">
            {/* Cabeçalho da cobrança */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  {getInitials(charge.client.name)}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {charge.client.name}
                  </h2>
                  <p className="text-sm text-slate-500">{charge.client.phone}</p>
                  {charge.appointment?.service && (
                    <p className="mt-1 text-sm text-slate-600">
                      Serviço: {charge.appointment.service.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {statusBadge(status)}
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(Number(amount || charge.amount))}
                </p>
              </div>
            </div>

            {/* Formulário de edição */}
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Valor (R$)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Recebido</option>
                    <option value="overdue">Inadimplente</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                {charge.paidAt && (
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">
                      Pago em
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatDateShort(charge.paidAt)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Descrição
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição da cobrança..."
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="space-y-1 text-sm text-slate-500">
                  <p>
                    Vencimento atual:{' '}
                    <span
                      className={
                        isOverdue ? 'font-semibold text-red-600' : 'font-medium'
                      }
                    >
                      {formatDateShort(charge.dueDate)}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/charges')}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" isLoading={updateMutation.isPending}>
                    Salvar alterações
                  </Button>
                </div>
              </div>
            </form>

            {charge.status === 'pending' && charge.stripePixCopyPaste && (
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
                <Button type="button" onClick={copyPix} variant="primary">
                  Copiar Pix copia e cola
                </Button>
                {toast && (
                  <span className="text-sm text-emerald-600">{toast}</span>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3 border-t border-slate-100 pt-6">
              <Link href={`/clients/${charge.client.id}`}>
                <Button type="button" variant="outline">
                  Ver cliente
                </Button>
              </Link>
              {charge.appointment && (
                <Link href="/schedule">
                  <Button type="button" variant="outline">
                    Ver agenda
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
