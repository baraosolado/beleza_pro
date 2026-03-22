'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle, Pencil, User } from 'lucide-react';
import { useState } from 'react';

import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';

type AppointmentDetail = {
  id: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
  reminderSent: boolean;
  client: { id: string; name: string; phone: string };
  service: { id: string; name: string; durationMin: number; price: number };
};

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointments', id],
    queryFn: () =>
      api.get<AppointmentDetail>(`/appointments/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      api.patch(`/appointments/${id}/status`, { status: 'confirmed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      setToast({ type: 'success', message: 'Presença confirmada.' });
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erro ao confirmar'
          : 'Erro ao confirmar';
      setToast({ type: 'error', message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      api.patch(`/appointments/${id}/status`, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      setToast({ type: 'success', message: 'Agendamento cancelado.' });
      setTimeout(() => router.push('/schedule'), 1500);
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erro ao cancelar'
          : 'Erro ao cancelar';
      setToast({ type: 'error', message });
    },
  });

  function statusBadge(status: string): React.ReactNode {
    const v =
      status === 'scheduled'
        ? 'scheduled'
        : status === 'confirmed'
          ? 'confirmed'
          : status === 'completed'
            ? 'completed'
            : status === 'cancelled'
              ? 'cancelled'
              : 'default';
    const label =
      status === 'scheduled'
        ? 'Agendado'
        : status === 'confirmed'
          ? 'Confirmado'
          : status === 'completed'
            ? 'Concluído'
            : status === 'cancelled'
              ? 'Cancelado'
              : status === 'no_show'
                ? 'Não compareceu'
                : status;
    return <Badge variant={v}>{label}</Badge>;
  }

  if (isLoading || !appointment) {
    return (
      <>
        <Header title="Agendamento" subtitle="Carregando..." />
        <main className="flex-1 overflow-auto p-8">
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </>
    );
  }

  const scheduledAt = new Date(appointment.scheduledAt);
  const canConfirm = appointment.status === 'scheduled';
  const canCancel =
    appointment.status === 'scheduled' || appointment.status === 'confirmed';

  return (
    <>
      <Header title="Agendamento" subtitle={appointment.service.name} />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link
            href="/schedule"
            className="inline-block text-sm font-medium text-slate-600 hover:text-primary"
          >
            ← Voltar à agenda
          </Link>

          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  <User className="size-6 text-primary" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {appointment.client.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {appointment.client.phone}
                  </p>
                </div>
              </div>
              {statusBadge(appointment.status)}
            </div>

            <dl className="mt-6 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-slate-400" />
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-400">
                    Data e hora
                  </dt>
                  <dd className="font-medium text-slate-800">
                    {formatDate(scheduledAt)} às {formatTime(scheduledAt)}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">
                  Serviço
                </dt>
                <dd className="text-slate-800">
                  {appointment.service.name} ·{' '}
                  {appointment.service.durationMin} min
                </dd>
              </div>
              {appointment.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-slate-400">
                    Observações
                  </dt>
                  <dd className="text-slate-800">{appointment.notes}</dd>
                </div>
              )}
              {appointment.reminderSent && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-slate-400">
                    Lembrete
                  </dt>
                  <dd className="text-slate-600">
                    Lembrete enviado por WhatsApp
                  </dd>
                </div>
              )}
            </dl>

            {toast && (
              <p
                className={
                  toast.type === 'error'
                    ? 'mt-4 text-sm text-red-500'
                    : 'mt-4 text-sm text-emerald-600'
                }
              >
                {toast.message}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              {canConfirm && (
                <Button
                  type="button"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => confirmMutation.mutate()}
                  isLoading={confirmMutation.isPending}
                >
                  <CheckCircle className="mr-2 size-4" />
                  Confirmar presença
                </Button>
              )}
              <Link href={`/schedule/new?clientId=${appointment.client.id}`}>
                <Button type="button" variant="outline">
                  <Pencil className="mr-2 size-4" />
                  Novo agendamento (mesmo cliente)
                </Button>
              </Link>
              <Link href={`/clients/${appointment.client.id}`}>
                <Button type="button" variant="outline">
                  Ver cliente
                </Button>
              </Link>
              {canCancel && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-amber-600 hover:bg-amber-50"
                  onClick={() => cancelMutation.mutate()}
                  isLoading={cancelMutation.isPending}
                >
                  Cancelar agendamento
                </Button>
              )}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
