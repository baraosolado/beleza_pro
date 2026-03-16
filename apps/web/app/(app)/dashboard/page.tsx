'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Banknote, CalendarDays, Clock, Users } from 'lucide-react';

import {
  AppointmentCard,
  Button,
  DonutChart,
  Skeleton,
  StatCard,
} from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

type Summary = {
  todayAppointments: number;
  monthReceived: number;
  monthPending: number;
  activeClientsCount: number;
};

type UpcomingItem = {
  id: string;
  scheduledAt: string;
  client: { name: string };
  service: { name: string };
  status: string;
};

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const res = await api.get<Summary>('/dashboard/summary');
      return res.data;
    },
  });
  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['dashboard', 'upcoming'],
    queryFn: async () => {
      const res = await api.get<UpcomingItem[] | { items: UpcomingItem[] }>(
        '/dashboard/upcoming'
      );
      const d = res.data;
      return Array.isArray(d) ? d : d.items ?? [];
    },
  });

  const items = Array.isArray(upcomingData) ? upcomingData : [];
  const received = Number(summary?.monthReceived ?? 0);
  const pending = Number(summary?.monthPending ?? 0);
  const overdue = 0;
  const today = new Date();

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Gerencie seu salão em tempo real"
        actionLabel="Novo Agendamento"
        onAction={() => window.location.assign('/schedule/new')}
      />
      <main className="flex-1 overflow-auto p-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {summaryLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <StatCard
                label="Agendamentos Hoje"
                value={summary?.todayAppointments ?? 0}
                icon={CalendarDays}
                variant="violet"
              />
              <StatCard
                label="Receita do Mês"
                value={formatCurrency(summary?.monthReceived ?? 0)}
                icon={Banknote}
                variant="emerald"
                subtitle="+12% este mês"
              />
              <StatCard
                label="Pagamentos Pendentes"
                value={formatCurrency(summary?.monthPending ?? 0)}
                icon={Clock}
                variant="amber"
              />
              <StatCard
                label="Clientes Ativos"
                value={summary?.activeClientsCount ?? 0}
                icon={Users}
                variant="violet"
              />
            </>
          )}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Agenda de Hoje
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  {formatDate(today)}
                </span>
                <Link
                  href="/schedule"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver agenda completa
                </Link>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
              {upcomingLoading ? (
                <div className="divide-y divide-slate-100">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-5">
                      <Skeleton className="h-12 w-1.5 rounded-full" />
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
                <div className="divide-y divide-slate-100">
                  {items.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
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
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Resumo do Mês
              </h2>
              <Link
                href="/charges"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver cobranças
              </Link>
            </div>
            <div className="mt-4">
              <DonutChart
                segments={[
                  { label: 'Recebido', value: received, color: '#10b981' },
                  { label: 'Pendente', value: pending, color: '#f59e0b' },
                  { label: 'Inadimplente', value: overdue, color: '#ef4444' },
                ]}
                centerLabel="Total"
                centerValue={formatCurrency(received + pending + overdue)}
              />
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
            Ações rápidas
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/schedule/new">
              <Button variant="outline">
                Novo Agendamento
              </Button>
            </Link>
            <Link href="/clients/new">
              <Button variant="outline">
                Nova Cliente
              </Button>
            </Link>
            <Button variant="outline">
              Enviar Lembrete
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
