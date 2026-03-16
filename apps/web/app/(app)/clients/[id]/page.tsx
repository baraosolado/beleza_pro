'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MessageCircle, Pencil } from 'lucide-react';

import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
};

type AppointmentItem = {
  id: string;
  scheduledAt: string;
  status: string;
  service: { name: string };
};

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['clients', id],
    queryFn: () => api.get<Client>(`/clients/${id}`).then((r) => r.data),
    enabled: !!id,
  });
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['clients', id, 'appointments'],
    queryFn: () =>
      api
        .get<AppointmentItem[]>(`/clients/${id}/appointments`)
        .then((r) => r.data),
    enabled: !!id,
  });

  const items = Array.isArray(appointments) ? appointments : [];

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
      status === 'scheduled'
        ? 'scheduled'
        : status === 'confirmed'
          ? 'confirmed'
          : status === 'completed'
            ? 'completed'
            : status === 'cancelled'
              ? 'cancelled'
              : 'default';
    return (
      <Badge variant={v}>
        {status === 'scheduled'
          ? 'Agendado'
          : status === 'confirmed'
            ? 'Confirmado'
            : status === 'completed'
              ? 'Concluído'
              : status === 'cancelled'
                ? 'Cancelado'
                : status}
      </Badge>
    );
  }

  if (clientLoading || !client) {
    return (
      <>
        <Header title="Cliente" />
        <main className="flex-1 overflow-auto p-8">
          <Skeleton className="mb-6 h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header title={client.name} subtitle="Detalhes da cliente" />
      <main className="flex-1 overflow-auto p-8">
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/clients" className="hover:text-primary">
            Clientes
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">{client.name}</span>
        </nav>

        <Card className="mb-8 p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-6">
              <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {getInitials(client.name)}
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {client.name}
                </h1>
                <p className="text-slate-600">{client.phone}</p>
                {client.email && (
                  <p className="text-sm text-slate-500">{client.email}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                    {items.length} atendimentos
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/schedule/new?clientId=${client.id}`}>
                <Button>Novo Agendamento</Button>
              </Link>
              <Button variant="outline" type="button">
                <MessageCircle className="size-4" />
                Enviar WhatsApp
              </Button>
              <Link href={`/clients/${client.id}/edit`}>
                <Button variant="ghost" type="button">
                  <Pencil className="size-4" />
                  Editar
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div>
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">
                Histórico de Atendimentos
              </h2>
              {appointmentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="text-slate-500">
                  Nenhum atendimento registrado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-2 font-medium">Data</th>
                        <th className="pb-2 font-medium">Serviço</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.slice(0, 10).map((apt) => (
                        <tr
                          key={apt.id}
                          className="border-b border-slate-100"
                        >
                          <td className="py-3">
                            {formatDate(apt.scheduledAt)} às{' '}
                            {formatTime(apt.scheduledAt)}
                          </td>
                          <td className="py-3">{apt.service.name}</td>
                          <td className="py-3">{statusBadge(apt.status)}</td>
                          <td className="py-3">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {items.length > 10 && (
                <button
                  type="button"
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                >
                  Carregar mais
                </button>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">
                Observações
              </h2>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={4}
                defaultValue={client.notes ?? ''}
                placeholder="Anotações sobre a cliente..."
              />
              <Button type="button" variant="outline" className="mt-3">
                Salvar
              </Button>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">
                Resumo Financeiro
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Total recebido</dt>
                  <dd className="font-bold text-emerald-600">
                    {formatCurrency(0)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Pendente</dt>
                  <dd className="font-bold text-amber-600">
                    {formatCurrency(0)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Último pagamento</dt>
                  <dd className="text-slate-600">—</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">
                WhatsApp Rápido
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Lembrete de agendamento
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Lembrete de pagamento
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Mensagem personalizada
                </button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
