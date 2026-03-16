'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { Badge, Button, Card, Skeleton } from '@/components/ui';
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
  const [toast, setToast] = useState<string | null>(null);

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

  if (isLoading || !charge) {
    return (
      <>
        <Header title="Cobrança" subtitle="Detalhe" />
        <main className="flex-1 overflow-auto p-8">
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </>
    );
  }

  const isOverdue =
    charge.status === 'pending' && new Date(charge.dueDate) < new Date();

  return (
    <>
      <Header title="Cobrança" subtitle={formatCurrency(Number(charge.amount))} />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link
            href="/charges"
            className="inline-block text-sm font-medium text-slate-600 hover:text-primary"
          >
            ← Voltar às cobranças
          </Link>

          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {getInitials(charge.client.name)}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
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
                {statusBadge(charge.status)}
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {formatCurrency(Number(charge.amount))}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">
                  Vencimento
                </dt>
                <dd
                  className={
                    isOverdue ? 'font-semibold text-red-600' : 'text-slate-800'
                  }
                >
                  {formatDateShort(charge.dueDate)}
                </dd>
              </div>
              {charge.paidAt && (
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-400">
                    Pago em
                  </dt>
                  <dd className="text-slate-800">
                    {formatDateShort(charge.paidAt)}
                  </dd>
                </div>
              )}
              {charge.description && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-slate-400">
                    Descrição
                  </dt>
                  <dd className="text-slate-800">{charge.description}</dd>
                </div>
              )}
            </dl>

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
