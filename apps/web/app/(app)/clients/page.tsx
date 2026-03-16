'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle, Search, Users } from 'lucide-react';

import { Badge, Button, Card, Input, Skeleton } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';

type ClientItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  lastAppointmentAt: string | null;
  totalSpent: number;
};

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'active' | 'new'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['clients', 'list', search, page, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: '10',
      });

      if (filter !== 'all') {
        params.set('status', filter);
      }

      const { data: response } = await api.get<{ items: ClientItem[]; total: number }>(
        `/clients?${params.toString()}`
      );

      return response;
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const from = total === 0 ? 0 : (page - 1) * 10 + 1;
  const to = Math.min(page * 10, total);

  const filters: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'active', label: 'Ativas' },
    { key: 'new', label: 'Novas este mês' },
  ];

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  function getWhatsappLink(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return '#';
    return `https://wa.me/55${digits}`;
  }

  return (
    <>
      <Header
        title="Clientes"
        subtitle={`${total} cliente${total !== 1 ? 's' : ''}`}
        actionLabel="Nova Cliente"
        onAction={() => window.location.assign('/clients/new')}
      />
      <main className="flex-1 overflow-auto p-8">
        {/* Filtros, busca e ordenação */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  filter === key
                    ? 'bg-primary text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span className="text-sm text-slate-500">Ordenar por:</span>
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-1 text-sm"
              >
                Mais recentes
              </Button>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Telefone</th>
                    <th className="px-6 py-4">Último atendimento</th>
                    <th className="px-6 py-4 text-right">Total gasto</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-9 rounded-full" />
                          <div>
                            <Skeleton className="mb-2 h-4 w-32" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-3 w-32" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-3 w-24" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Skeleton className="ml-auto h-3 w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Skeleton className="mx-auto h-3 w-10" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="size-12 text-slate-300" />
              <p className="mt-2 font-medium text-slate-600">
                Nenhum cliente encontrado
              </p>
              <Link href="/clients/new">
                <Button variant="outline" className="mt-4">
                  Nova Cliente
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Telefone</th>
                      <th className="px-6 py-4">Último atendimento</th>
                      <th className="px-6 py-4 text-right">Total gasto</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((client) => (
                      <tr
                        key={client.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {getInitials(client.name)}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">
                                {client.name}
                              </p>
                              {client.email && (
                                <p className="text-sm text-slate-500">
                                  {client.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MessageCircle className="size-4 text-emerald-500" />
                            <a
                              href={getWhatsappLink(client.phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              {client.phone}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatDate(client.lastAppointmentAt)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-emerald-600">
                          {formatCurrency(client.totalSpent ?? 0)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="confirmed">
                            {client.lastAppointmentAt ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link href={`/clients/${client.id}`}>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="px-0 text-sm font-semibold text-primary hover:text-primary hover:bg-transparent"
                            >
                              Ver
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-6 py-4">
                <p className="text-sm text-slate-500">
                  Exibindo {from}–{to} de {total} clientes
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </main>
    </>
  );
}
