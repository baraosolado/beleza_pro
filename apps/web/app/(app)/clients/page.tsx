'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle, MoreHorizontal, Search, Users } from 'lucide-react';

import { Badge, Button, Card, Input, Skeleton } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';

type ClientItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'active' | 'new'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['clients', 'list', search, page],
    queryFn: () =>
      api
        .get<{ items: ClientItem[]; total: number }>(
          `/clients?search=${encodeURIComponent(search)}&page=${page}&limit=10`
        )
        .then((r) => r.data),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const from = total === 0 ? 0 : (page - 1) * 10 + 1;
  const to = Math.min(page * 10, total);

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou telefone"
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'all', label: 'Todas' },
              { key: 'active', label: 'Ativas' },
              { key: 'new', label: 'Novas este mês' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                filter === key
                  ? 'bg-primary/10 text-primary'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Card className="overflow-hidden p-0">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-6">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="mb-2 h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              ))}
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
              <div className="divide-y divide-slate-100">
                {items.map((client) => (
                  <div
                    key={client.id}
                    className="flex flex-wrap items-center gap-4 p-6 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {getInitials(client.name)}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800">
                          {client.name}
                        </p>
                        {client.email && (
                          <p className="text-sm text-slate-500">
                            {client.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MessageCircle className="size-4 text-emerald-500" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                    <div className="text-sm text-slate-500">—</div>
                    <div className="font-bold text-emerald-600">
                      {formatCurrency(0)}
                    </div>
                    <div>
                      <Badge variant="confirmed">Ativa</Badge>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="ghost" type="button">
                          Ver
                        </Button>
                      </Link>
                      <button
                        type="button"
                        className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Mais opções"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
