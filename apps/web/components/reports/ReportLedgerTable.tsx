'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

import type { ReportLedgerRow } from './reports.types';

const DOMAIN_LABEL: Record<ReportLedgerRow['domain'], string> = {
  vendas: 'Vendas',
  agenda: 'Agenda',
  comunicacao: 'WhatsApp',
  financeiro: 'Financeiro',
  operacional: 'Operacional',
};

const STATUS_LABEL: Record<ReportLedgerRow['status'], string> = {
  ok: 'Ok',
  alerta: 'Alerta',
  critico: 'Crítico',
};

type SortKey = 'at' | 'entity' | 'domain' | 'metric' | 'value' | 'status';

type Props = {
  rows: ReportLedgerRow[];
};

export function ReportLedgerTable(props: Props): React.ReactElement {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const filtered = useMemo(() => {
    const q = debouncedSearch;
    if (!q) return props.rows;
    return props.rows.filter((r) => {
      const blob = `${r.entity} ${r.metric} ${DOMAIN_LABEL[r.domain]} ${STATUS_LABEL[r.status]} ${r.valueLabel}`.toLowerCase();
      return blob.includes(q);
    });
  }, [props.rows, debouncedSearch]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = sortKey === 'at' ? a.at : sortKey === 'value' ? a.value : (a[sortKey] as string);
      const vb = sortKey === 'at' ? b.at : sortKey === 'value' ? b.value : (b[sortKey] as string);
      if (sortKey === 'value') return (a.value - b.value) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR') * dir;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const slice = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'at' ? 'desc' : 'asc');
    }
    setPage(0);
  }

  return (
    <section>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Tabela detalhada
      </h3>
      <Card className="border border-border overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <input
            type="search"
            placeholder="Buscar na tabela…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            className="w-full max-w-md rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="tabular-nums">{sorted.length} registros</span>
            <label className="flex items-center gap-1">
              <span className="text-xs">Linhas</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="rounded border border-border bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                {(
                  [
                    ['at', 'Data'],
                    ['entity', 'Entidade'],
                    ['domain', 'Domínio'],
                    ['metric', 'Métrica'],
                    ['value', 'Valor'],
                    ['status', 'Status'],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key} className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="font-semibold hover:text-primary"
                    >
                      {label}
                      {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    Nenhum registro para os filtros atuais. Amplie o período ou limpe a busca.
                  </td>
                </tr>
              ) : (
                slice.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-border/80 dark:border-slate-800"
                  >
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700 dark:text-slate-200">
                      {format(parseISO(r.at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-slate-800 dark:text-slate-100">
                      {r.entity}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                        {DOMAIN_LABEL[r.domain]}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-3 py-2 text-slate-700 dark:text-slate-200">
                      {r.metric}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-medium text-slate-900 dark:text-slate-50">
                      {r.valueLabel}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          r.status === 'ok' && 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
                          r.status === 'alerta' &&
                            'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
                          r.status === 'critico' && 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100'
                        )}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > pageSize ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3 text-sm dark:border-slate-800">
            <span className="text-slate-500">
              Página {safePage + 1} de {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-border px-3 py-1 font-medium disabled:opacity-40 dark:border-slate-700"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                className="rounded-lg border border-border px-3 py-1 font-medium disabled:opacity-40 dark:border-slate-700"
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
