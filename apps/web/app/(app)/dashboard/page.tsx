'use client';

import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Banknote, Clock, PlusCircle, Send, UserPlus, Users } from 'lucide-react';

import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal';
import {
  AppointmentCard,
  DonutChart,
  Skeleton,
} from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import {
  formatCurrency,
  formatDateLong,
  formatTime,
} from '@/lib/utils';
import { cn } from '@/lib/utils';

type Summary = {
  todayAppointments: number;
  monthReceived: number;
  monthPending: number;
  monthOverdue: number;
  activeClientsCount: number;
};

type UpcomingItem = {
  id: string;
  scheduledAt: string;
  client: { id: string; name: string; phone?: string };
  service: { name: string };
  status: string;
};

export default function DashboardPage() {
  const today = new Date();
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);
  const openNewAppointment = useCallback(() => setNewAppointmentOpen(true), []);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const res = await api.get<Summary>('/dashboard/summary');
      return res.data;
    },
  });

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['dashboard', 'upcoming', 'today'],
    queryFn: async () => {
      const res = await api.get<UpcomingItem[] | { items: UpcomingItem[] }>(
        '/dashboard/upcoming?today=1'
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d as { items: UpcomingItem[] })?.items ?? [];
    },
  });

  const items = Array.isArray(upcomingData) ? upcomingData : [];
  const received = Number(summary?.monthReceived ?? 0);
  const pending = Number(summary?.monthPending ?? 0);
  const overdue = Number(summary?.monthOverdue ?? 0);
  const totalFinancial = received + pending + overdue;

  return (
    <>
      <NewAppointmentModal
        open={newAppointmentOpen}
        onOpenChange={setNewAppointmentOpen}
        defaultDate={format(today, 'yyyy-MM-dd')}
      />
      <Header
        title="Dashboard"
        subtitle="Gerencie seu salão em tempo real"
        actionLabel="Novo Agendamento"
        onAction={openNewAppointment}
      />
      <main className="flex-1 overflow-auto bg-app-bg p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-content space-y-6">
          {/* Métricas */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {summaryLoading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[140px] rounded-xl" />
              ))
            ) : (
              <>
                <div className="rounded-xl border border-border bg-app-surface p-5 shadow-card transition-shadow hover:shadow-card-hover">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-medium text-slate-500">Agendamentos Hoje</span>
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Clock className="size-5" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="metric text-ink-primary">
                      {summary?.todayAppointments ?? 0}
                    </span>
                    <span className="text-sm text-ink-muted">total hoje</span>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-app-surface p-5 shadow-card transition-shadow hover:shadow-card-hover">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-medium text-slate-500">
                      Receita do Mês
                    </span>
                    <span className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                      <Banknote className="size-5" />
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold tracking-tight text-slate-800">
                      {formatCurrency(summary?.monthReceived ?? 0)}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-600">
                      Recebido este mês
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-app-surface p-5 shadow-card transition-shadow hover:shadow-card-hover">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-medium text-slate-500">
                      Pagamentos Pendentes
                    </span>
                    <span className="rounded-lg bg-amber-100 p-2 text-amber-600">
                      <Clock className="size-5" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-800">
                      {formatCurrency(summary?.monthPending ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-app-surface p-5 shadow-card transition-shadow hover:shadow-card-hover">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-medium text-slate-500">
                      Clientes Ativos
                    </span>
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Users className="size-5" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-800">
                      {summary?.activeClientsCount ?? 0}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Agenda de Hoje */}
            <div className="space-y-6 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Agenda de Hoje
                  </h3>
                  <p className="text-sm text-slate-500">
                    {formatDateLong(today)}
                  </p>
                </div>
                <Link
                  href="/schedule"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Ver agenda completa
                </Link>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                {upcomingLoading ? (
                  <div className="divide-y divide-border/60">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-5">
                        <Skeleton className="h-12 w-1.5 shrink-0 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="mb-2 h-4 w-16" />
                          <Skeleton className="mb-1 h-5 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <p className="p-6 text-slate-500">
                    Nenhum agendamento para hoje.
                  </p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {items.map((apt) => (
                      <Link
                        key={apt.id}
                        href={`/schedule/${apt.id}`}
                        className="flex items-center p-5 transition-colors hover:bg-slate-50"
                      >
                        <AppointmentCard
                          time={formatTime(apt.scheduledAt)}
                          clientName={apt.client.name}
                          serviceName={apt.service.name}
                          status={
                            apt.status === 'scheduled'
                              ? 'scheduled'
                              : apt.status === 'confirmed'
                                ? 'confirmed'
                                : 'completed'
                          }
                          onWhatsApp={
                            apt.client.phone
                              ? () => {
                                  const phone = apt.client.phone!.replace(/\D/g, '');
                                  const url = phone.startsWith('55')
                                    ? `https://wa.me/${phone}`
                                    : `https://wa.me/55${phone}`;
                                  window.open(url, '_blank');
                                }
                              : undefined
                          }
                          className="flex-1 border-0 p-0 hover:bg-transparent"
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Resumo do Mês */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">
                  Resumo do Mês
                </h3>
                <Link
                  href="/charges"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Ver cobranças
                </Link>
              </div>
              <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <DonutChart
                  segments={[
                    { label: 'Recebido', value: received, color: '#10b981' },
                    { label: 'Pendente', value: pending, color: '#f59e0b' },
                    { label: 'Inadimplente', value: overdue, color: '#ef4444' },
                  ]}
                  centerLabel="Total"
                  centerValue={formatCurrency(totalFinancial)}
                  formatSegmentValue={formatCurrency}
                />
              </div>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="hidden border-t border-border py-6 md:block">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">
              Ações Rápidas
            </h4>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={openNewAppointment}
                className={cn(
                  'flex items-center gap-2 rounded-xl border-2 border-primary px-6 py-3 font-bold text-primary transition-colors hover:bg-primary/5'
                )}
              >
                <PlusCircle className="size-5" />
                Novo Agendamento
              </button>
              <Link
                href="/clients/new"
                className={cn(
                  'flex items-center gap-2 rounded-xl border-2 border-primary px-6 py-3 font-bold text-primary transition-colors hover:bg-primary/5'
                )}
              >
                <UserPlus className="size-5" />
                Nova Cliente
              </Link>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-xl border-2 border-primary px-6 py-3 font-bold text-primary transition-colors hover:bg-primary/5'
                )}
              >
                <Send className="size-5" />
                Enviar Lembrete
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
