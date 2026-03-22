'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CalendarClock,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileEdit,
  History,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  StickyNote,
  Wallet,
} from 'lucide-react';

import { Button, Skeleton } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt?: string;
  appointmentsCount?: number;
  totalReceived?: number;
  totalPending?: number;
  totalSpent?: number;
  lastPaymentAt?: string | null;
};

type AppointmentItem = {
  id: string;
  scheduledAt: string;
  status: string;
  service: { name: string; durationMin?: number | null };
};

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

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

  useEffect(() => {
    if (client) setNotes(client.notes ?? '');
  }, [client]);

  const updateNotesMutation = useMutation({
    mutationFn: (newNotes: string) =>
      api.put(`/clients/${id}`, { notes: newNotes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', id] });
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
    const map: Record<string, { label: string; className: string }> = {
      scheduled: {
        label: 'Agendado',
        className:
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      },
      confirmed: {
        label: 'Confirmado',
        className:
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      },
      completed: {
        label: 'Concluído',
        className:
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      },
      cancelled: {
        label: 'Cancelado',
        className:
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      },
      no_show: {
        label: 'Faltou',
        className:
          'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      },
    };
    const config = map[status] ?? {
      label: status,
      className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    };
    return (
      <span
        className={cn(
          'px-2 py-1 text-[10px] font-bold uppercase rounded',
          config.className
        )}
      >
        {config.label}
      </span>
    );
  }

  function getWhatsappLink(phone: string, text?: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    const base = `https://wa.me/55${digits}`;
    if (!text) return base;
    return `${base}?text=${encodeURIComponent(text)}`;
  }

  function openWhatsApp(message: string) {
    if (!client) return;
    const url = getWhatsappLink(client.phone, message);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (clientLoading || !client) {
    return (
      <>
        <Header title="Cliente" />
        <main className="flex-1 min-h-0 overflow-y-auto p-8">
          <Skeleton className="mb-6 h-5 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </>
    );
  }

  const displayPhone = client.phone.replace(/^\+55/, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');

  return (
    <>
      <Header title={client.name} />
      <main className="flex-1 min-h-0 overflow-y-auto p-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/clients" className="hover:text-primary">
            Clientes
          </Link>
          <ChevronRight className="size-4 text-slate-400" />
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {client.name}
          </span>
        </nav>

        {/* Profile Header Card */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <div
                className="flex size-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white"
                aria-label={`Iniciais da cliente ${client.name} em fundo violeta`}
              >
                {getInitials(client.name)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {client.name}
                </h2>
                <div className="mt-1 flex flex-col gap-2 text-slate-500 sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex items-center gap-1 text-sm">
                    <Phone className="size-4" />
                    {displayPhone}
                  </span>
                  {client.email && (
                    <>
                      <span className="hidden text-slate-300 sm:inline">•</span>
                      <span className="flex items-center gap-1 text-sm">
                        <Mail className="size-4" />
                        {client.email}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {(client.appointmentsCount ?? items.length) || 0} atendimentos
                  </span>
                  {typeof client.totalSpent === 'number' && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {formatCurrency(client.totalSpent)} gasto no total
                    </span>
                  )}
                  {client.createdAt && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Cliente desde{' '}
                      {new Intl.DateTimeFormat('pt-BR', {
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(client.createdAt))}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-3 md:w-auto">
              <Link href={`/schedule/new?clientId=${client.id}`} className="flex-1 md:flex-none">
                <Button className="w-full gap-2 bg-primary font-bold hover:bg-primary/90">
                  <Plus className="size-4" />
                  Novo Agendamento
                </Button>
              </Link>
              <Button
                type="button"
                className="flex-1 gap-2 bg-primary/10 font-bold text-primary hover:bg-primary/20 md:flex-none"
                onClick={() =>
                  openWhatsApp(
                    `Oi ${client.name.split(' ')[0]}, tudo bem? Aqui é do Beleza Pro.`
                  )
                }
              >
                <MessageCircle className="size-4" />
                Enviar WhatsApp
              </Button>
              <Link href={`/clients/${client.id}/edit`} className="flex-1 md:flex-none">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-2 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <Pencil className="size-4" />
                  Editar
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Left Column - Histórico */}
          <div className="space-y-8 lg:col-span-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Histórico de Atendimentos
                </h3>
                <History className="size-5 text-slate-400" />
              </div>
              <div className="overflow-x-auto">
                {appointmentsLoading ? (
                  <div className="space-y-3 p-6">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <p className="p-6 text-slate-500">
                    Nenhum atendimento registrado.
                  </p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Data</th>
                        <th className="px-6 py-3 font-semibold">Serviço</th>
                        <th className="px-6 py-3 font-semibold">Duração</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.slice(0, 10).map((apt) => (
                        <tr
                          key={apt.id}
                          className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            {formatDateShort(apt.scheduledAt)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {apt.service.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {apt.service.durationMin
                              ? `${apt.service.durationMin} min`
                              : '—'}
                          </td>
                          <td className="px-6 py-4">
                            {statusBadge(apt.status)}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold">
                            —
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {items.length > 10 && (
                <div className="border-t border-slate-100 p-4 text-center dark:border-slate-800">
                  <button
                    type="button"
                    className="font-bold text-primary hover:underline"
                  >
                    Carregar mais atendimentos
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Observações */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <StickyNote className="size-5 text-primary" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Observações
                </h3>
              </div>
              <textarea
                className="h-32 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações sobre a cliente..."
              />
              <Button
                type="button"
                className="mt-4 w-full bg-primary/10 font-bold text-primary hover:bg-primary/20"
                isLoading={updateNotesMutation.isPending}
                onClick={() => updateNotesMutation.mutate(notes)}
              >
                Salvar observações
              </Button>
            </div>

            {/* Resumo Financeiro */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Resumo Financeiro
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Total Gasto
                  </p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(client.totalReceived ?? 0)}
                  </p>
                </div>
                <div className="flex items-end justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500">Pendente</p>
                    <p className="text-lg font-bold text-amber-500">
                      {formatCurrency(client.totalPending ?? 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Último pagamento</p>
                    <p className="text-sm font-medium">
                      {client.lastPaymentAt
                        ? new Intl.DateTimeFormat('pt-BR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          }).format(new Date(client.lastPaymentAt))
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="mt-6 flex w-full items-center justify-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-primary"
              >
                Ver todas as cobranças
                <ExternalLink className="size-4" />
              </button>
            </div>

            {/* WhatsApp Rápido */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <MessageCircle className="size-5 text-primary" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  WhatsApp Rápido
                </h3>
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Enviar mensagem rápida para a cliente:
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-left text-sm font-medium text-slate-700 transition-all hover:bg-primary/10 hover:text-primary dark:bg-slate-800 dark:text-slate-300"
                  onClick={() =>
                    openWhatsApp(
                      `Oi ${client.name.split(' ')[0]}, tudo bem? Lembrete do seu agendamento conosco.`
                    )
                  }
                >
                  <CalendarClock className="size-5" />
                  Lembrete de agendamento
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-left text-sm font-medium text-slate-700 transition-all hover:bg-primary/10 hover:text-primary dark:bg-slate-800 dark:text-slate-300"
                  onClick={() =>
                    openWhatsApp(
                      `Oi ${client.name.split(' ')[0]}, tudo bem? Lembrete de pagamento do seu atendimento.`
                    )
                  }
                >
                  <Wallet className="size-5" />
                  Lembrete de pagamento
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-left text-sm font-medium text-slate-700 transition-all hover:bg-primary/10 hover:text-primary dark:bg-slate-800 dark:text-slate-300"
                  onClick={() =>
                    openWhatsApp(`Oi ${client.name.split(' ')[0]}, tudo bem?`)
                  }
                >
                  <FileEdit className="size-5" />
                  Mensagem personalizada
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
