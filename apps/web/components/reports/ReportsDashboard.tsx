'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api';

import { ReportChartsGrid } from './ReportChartsGrid';
import { ReportLedgerTable } from './ReportLedgerTable';
import { ReportSectionsBody } from './ReportSectionsBody';
import { ReportSectionsFooter } from './ReportSectionsFooter';
import {
  filterLedgerByDomains,
  parseDomainsParam,
  REPORT_DOMAINS,
  type ReportDomainId,
  serializeDomainsParam,
} from './reports.domains';
import { downloadLedgerCsv } from './reports.export';
import type { ReportsApiResponse } from './reports.types';

const LS_COLLAPSED = 'reports.filtersCollapsed';
const LS_SAVED = 'reports.savedView';
const STALE_MS = 5 * 60 * 1000;

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = subDays(to, 29);
  return { from: ymd(from), to: ymd(to) };
}

function activeFilterCount(
  compareOn: boolean,
  domains: ReportDomainId[] | null
): number {
  const nDom =
    domains != null && domains.length > 0 && domains.length < REPORT_DOMAINS.length
      ? domains.length
      : 0;
  return (compareOn ? 1 : 0) + nDom;
}

export function ReportsDashboard(): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaults = useMemo(() => defaultRange(), []);

  const fromStr = searchParams.get('from') ?? defaults.from;
  const toStr = searchParams.get('to') ?? defaults.to;
  const compareOn = searchParams.get('compare') === 'previous';
  const activeDomains = useMemo(
    () => parseDomainsParam(searchParams.get('domains')),
    [searchParams]
  );

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const collapsed = localStorage.getItem(LS_COLLAPSED) === '1';
    setFiltersOpen(!collapsed);
  }, []);

  const setQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '') p.delete(k);
        else p.set(k, v);
      }
      const q = p.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const hasFrom = searchParams.has('from');
    const hasTo = searchParams.has('to');
    if (!hasFrom && !hasTo) {
      setQuery({ from: defaults.from, to: defaults.to });
    }
  }, [defaults.from, defaults.to, searchParams, setQuery]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['reports', fromStr, toStr, compareOn ? 'previous' : 'none'],
    queryFn: () =>
      api
        .get<ReportsApiResponse>('/reports', {
          params: {
            from: fromStr,
            to: toStr,
            ...(compareOn ? { compare: 'previous' as const } : {}),
          },
        })
        .then((r) => r.data),
    staleTime: STALE_MS,
  });

  const subtitle = useMemo(() => {
    try {
      const a = format(parseISO(fromStr), 'dd MMM yyyy', { locale: ptBR });
      const b = format(parseISO(toStr), 'dd MMM yyyy', { locale: ptBR });
      const c = compareOn ? ' · Comparando com período anterior equivalente' : '';
      return `${a} – ${b}${c}`;
    } catch {
      return 'Métricas do seu negócio no período escolhido';
    }
  }, [fromStr, toStr, compareOn]);

  const ledgerRows = useMemo(() => {
    const raw = data?.ledger ?? [];
    return filterLedgerByDomains(raw, activeDomains);
  }, [data?.ledger, activeDomains]);

  const filterBadge = activeFilterCount(compareOn, activeDomains);

  function setPreset(key: string): void {
    const today = new Date();
    const t = ymd(today);
    if (key === 'today') setQuery({ from: t, to: t });
    if (key === '7d') setQuery({ from: ymd(subDays(today, 6)), to: t });
    if (key === '30d') setQuery({ from: ymd(subDays(today, 29)), to: t });
    if (key === '90d') setQuery({ from: ymd(subDays(today, 89)), to: t });
    if (key === 'month') setQuery({ from: ymd(startOfMonth(today)), to: t });
    if (key === 'year') setQuery({ from: ymd(startOfYear(today)), to: t });
  }

  function toggleDomain(id: ReportDomainId): void {
    const all = REPORT_DOMAINS.map((d) => d.id);
    const cur = new Set(activeDomains ?? all);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    if (cur.size === 0 || cur.size === all.length) {
      setQuery({ domains: undefined });
    } else {
      setQuery({ domains: serializeDomainsParam([...cur] as ReportDomainId[]) });
    }
  }

  function domainChipActive(id: ReportDomainId): boolean {
    if (!activeDomains?.length) return true;
    return activeDomains.includes(id);
  }

  function persistCollapse(open: boolean): void {
    setFiltersOpen(open);
    localStorage.setItem(LS_COLLAPSED, open ? '0' : '1');
  }

  function saveFavoriteView(): void {
    localStorage.setItem(
      LS_SAVED,
      JSON.stringify({
        from: fromStr,
        to: toStr,
        compare: compareOn,
        domains: activeDomains ?? [],
      })
    );
  }

  function restoreFavoriteView(): void {
    const raw = localStorage.getItem(LS_SAVED);
    if (!raw) return;
    try {
      const o = JSON.parse(raw) as {
        from?: string;
        to?: string;
        compare?: boolean;
        domains?: ReportDomainId[];
      };
      setQuery({
        from: o.from,
        to: o.to,
        compare: o.compare ? 'previous' : undefined,
        domains:
          o.domains?.length && o.domains.length < REPORT_DOMAINS.length
            ? serializeDomainsParam(o.domains)
            : undefined,
      });
    } catch {
      return;
    }
  }

  function clearFilters(): void {
    const d = defaultRange();
    setQuery({
      from: d.from,
      to: d.to,
      compare: undefined,
      domains: undefined,
    });
  }

  function runExportCsv(): void {
    const meta = [
      `# Período: ${fromStr} a ${toStr}`,
      `# Comparar período anterior: ${compareOn ? 'sim' : 'não'}`,
      `# Domínios: ${activeDomains?.length ? activeDomains.join(',') : 'todos'}`,
      `# Gerado em: ${new Date().toISOString()}`,
    ];
    downloadLedgerCsv(ledgerRows, meta);
    setExportOpen(false);
  }

  return (
    <>
      <Header
        title="Relatórios"
        subtitle={subtitle}
        className="border-b border-border bg-white print:hidden"
      />
      <main
        id="reports-print-root"
        className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950/40"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <Card className="border border-border p-4 dark:border-slate-800 dark:bg-slate-900 print:shadow-none">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Período</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Até 366 dias por consulta. Dados em cache por alguns minutos.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      ['today', 'Hoje'],
                      ['7d', '7 dias'],
                      ['30d', '30 dias'],
                      ['90d', '90 dias'],
                      ['month', 'Este mês'],
                      ['year', 'Este ano'],
                    ] as const
                  ).map(([k, label]) => (
                    <Button
                      key={k}
                      type="button"
                      variant="outline"
                      className="h-8 px-3"
                      onClick={() => setPreset(k)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      De
                    </label>
                    <input
                      type="date"
                      value={fromStr}
                      onChange={(e) => setQuery({ from: e.target.value || undefined })}
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Até
                    </label>
                    <input
                      type="date"
                      value={toStr}
                      onChange={(e) => setQuery({ to: e.target.value || undefined })}
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={compareOn}
                    onChange={(e) =>
                      setQuery({ compare: e.target.checked ? 'previous' : undefined })
                    }
                    className="rounded border-border"
                  />
                  Comparar com período anterior
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-3"
                  onClick={saveFavoriteView}
                >
                  Salvar filtros
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-3"
                  onClick={restoreFavoriteView}
                >
                  Restaurar salvos
                </Button>
                <div className="relative">
                  <Button
                    type="button"
                    className="h-8 gap-1 px-3"
                    onClick={() => setExportOpen((o) => !o)}
                  >
                    Exportar
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  {exportOpen ? (
                    <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border border-border bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={runExportCsv}
                      >
                        Exportar CSV (tabela)
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => {
                          setExportOpen(false);
                          window.print();
                        }}
                      >
                        PDF / Imprimir visão
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-border dark:border-slate-800 dark:bg-slate-900 print:hidden">
            <button
              type="button"
              onClick={() => persistCollapse(!filtersOpen)}
              className="flex w-full items-center justify-between gap-2 p-4 text-left"
            >
              <span className="font-semibold text-slate-900 dark:text-slate-50">
                Filtros avançados
                {!filtersOpen && filterBadge > 0 ? (
                  <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    {filterBadge} ativo{filterBadge > 1 ? 's' : ''}
                  </span>
                ) : null}
              </span>
              {filtersOpen ? (
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
              ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
              )}
            </button>
            {filtersOpen ? (
              <div className="border-t border-border px-4 pb-4 pt-2 dark:border-slate-800">
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                  Domínios (afetam gráficos e tabela detalhada). Vazio = todos.
                </p>
                <div className="flex flex-wrap gap-2">
                  {REPORT_DOMAINS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDomain(d.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        domainChipActive(d.id)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {filterBadge > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 h-8 px-3"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Card>

          {isLoading && (
            <div className="grid animate-pulse gap-4">
              <div className="h-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              Não foi possível carregar os relatórios.{' '}
              <Button
                type="button"
                variant="outline"
                className="ml-2 h-8 px-3"
                onClick={() => void refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {data && !isLoading ? (
            <>
              {data.periodMetrics.appointmentsTotal === 0 &&
              data.periodMetrics.chargesPaidInPeriodCount === 0 &&
              data.periodMetrics.whatsappMessagesTotal === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  Poucos eventos neste intervalo. Amplie o período ou verifique se há agendamentos e
                  cobranças registrados.
                </p>
              ) : null}
              <ReportSectionsBody data={data} />
              <ReportChartsGrid data={data} activeDomains={activeDomains} />
              <ReportLedgerTable rows={ledgerRows} />
              <ReportSectionsFooter data={data} />
            </>
          ) : null}

          {isFetching && !isLoading ? (
            <p className="text-center text-xs text-slate-500">Atualizando dados…</p>
          ) : null}
        </div>
      </main>
    </>
  );
}
