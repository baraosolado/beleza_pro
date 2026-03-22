'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Search, Scissors } from 'lucide-react';

import { Button } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';

type PreviewResponse = { pdfUrl?: string; pdfBase64?: string };

type ClientItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt?: string;
  totalSpent?: number;
};

type ChargeItem = {
  id: string;
  /** API pode serializar Decimal como string */
  amount: number | string;
  status: string;
  dueDate: string;
  description: string | null;
  clientId: string;
  client: { name: string; email: string | null };
  appointment?: { service?: { name: string } } | null;
};

function chargeAmountNumber(amount: number | string): number {
  const n = typeof amount === 'number' ? amount : Number(amount);
  return Number.isFinite(n) ? n : 0;
}

function formatDateRef(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'd MMM yyyy', { locale: ptBR });
}

export default function SendInvoicePage() {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'list', search],
    queryFn: () =>
      api
        .get<{ items: ClientItem[]; total: number }>(
          `/clients?search=${encodeURIComponent(search)}&limit=20`
        )
        .then((r) => r.data),
    enabled: search.length >= 1,
  });

  const { data: chargesData } = useQuery({
    queryKey: ['charges', 'open'],
    queryFn: () =>
      api
        .get<{ items: ChargeItem[]; total: number }>('/charges?limit=100')
        .then((r) => r.data),
  });

  const allCharges = chargesData?.items ?? [];
  const openChargesForClient = useMemo(() => {
    if (!selectedClient) return [];
    return allCharges.filter(
      (c) =>
        c.clientId === selectedClient.id &&
        c.status !== 'paid' &&
        c.status !== 'cancelled'
    );
  }, [allCharges, selectedClient]);

  const selectedCharges = useMemo(
    () => openChargesForClient.filter((c) => selectedIds.has(c.id)),
    [openChargesForClient, selectedIds]
  );
  const subtotal = useMemo(
    () =>
      selectedCharges.reduce(
        (sum, c) => sum + chargeAmountNumber(c.amount),
        0
      ),
    [selectedCharges]
  );

  const chargeIdsArray = useMemo(
    () => Array.from(selectedIds).sort(),
    [selectedIds]
  );
  const canRequestPreview = Boolean(
    selectedClient && chargeIdsArray.length > 0
  );

  const {
    data: previewData,
    isLoading: previewLoading,
    isFetching: previewFetching,
    error: previewError,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ['send-invoice', 'preview', selectedClient?.id, chargeIdsArray.join(',')],
    queryFn: () =>
      api
        .post<PreviewResponse>('/send-invoice/preview', {
          clientId: selectedClient!.id,
          chargeIds: chargeIdsArray,
        })
        .then((r) => r.data),
    enabled: false, // só dispara quando o usuário clicar em "Gerar PDF"
    staleTime: 60 * 1000,
  });

  // Blob URL a partir do base64 para o iframe (evita limite de tamanho do data URL no navegador)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!previewData?.pdfBase64) {
      setPdfBlobUrl(null);
      return;
    }
    const raw = previewData.pdfBase64.replace(/\s/g, '').trim();
    try {
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch {
      setPdfBlobUrl(null);
    }
  }, [previewData?.pdfBase64]);

  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const sendMutation = useMutation({
    mutationFn: () =>
      api
        .post<{ success: boolean }>('/send-invoice/send', {
          clientId: selectedClient!.id,
          chargeIds: chargeIdsArray,
        })
        .then((r) => r.data),
    onSuccess: () => {
      setToast({ type: 'success', message: 'Conta enviada pelo WhatsApp com sucesso.' });
    },
    onError: (err: unknown) => {
      const res = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string; code?: string }; status?: number } }).response
        : undefined;
      const msg = res?.data?.error ?? 'Erro ao enviar';
      setToast({ type: 'error', message: msg });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: () =>
      api
        .post<PreviewResponse>('/send-invoice/preview', {
          clientId: selectedClient!.id,
          chargeIds: chargeIdsArray,
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      if (data.pdfUrl) {
        const a = document.createElement('a');
        a.href = data.pdfUrl;
        a.download = `fatura-${selectedClient?.name ?? 'cliente'}.pdf`;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (data.pdfBase64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.pdfBase64}`;
        link.download = `fatura-${selectedClient?.name ?? 'cliente'}.pdf`;
        link.click();
      }
    },
    onError: () => {
      setToast({ type: 'error', message: 'Não foi possível gerar o PDF.' });
    },
  });

  const toggleCharge = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (openChargesForClient.every((c) => selectedIds.has(c.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(openChargesForClient.map((c) => c.id)));
    }
  };

  const clientSearchResults = clientsData?.items ?? [];
  const showClientDropdown = search.length >= 1 && clientSearchResults.length > 0 && !selectedClient;

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function getChargeDescription(c: ChargeItem): string {
    return c.description ?? c.appointment?.service?.name ?? 'Cobrança';
  }

  return (
    <>
      <Header title="Enviar Conta" />
      <main className="flex-1 min-h-0 overflow-y-auto p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Enviar Conta
              </h2>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Gere o resumo de gastos e envie o PDF para a cliente
              </p>
            </div>
            <Link href="/charges">
              <Button
                type="button"
                className="bg-primary/10 font-bold text-primary hover:bg-primary/20"
              >
                Ver Histórico
              </Button>
            </Link>
          </header>

          <div className="grid grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="col-span-12 space-y-6 lg:col-span-7">
              {/* Search */}
              <div className="rounded-xl border border-border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    className="w-full rounded-lg border-0 bg-slate-100 py-3 pl-10 pr-4 text-base focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Selecionar Cliente (ex: Ana Silva)"
                    value={selectedClient ? selectedClient.name : search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (selectedClient) setSelectedClient(null);
                    }}
                    onFocus={() => setSearch((s) => (selectedClient ? '' : s))}
                  />
                  {showClientDropdown && (
                    <ul className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                      {clientSearchResults.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                            onClick={() => {
                              setSelectedClient(c);
                              setSearch('');
                              setSelectedIds(new Set());
                            }}
                          >
                            {c.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Client Profile Card */}
              {selectedClient && (
                <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-4 border-b border-border/60 p-6 dark:border-slate-800">
                    <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10 text-xl font-bold text-primary">
                      {getInitials(selectedClient.name)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {selectedClient.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-4">
                        <p className="text-sm text-slate-500">
                          <span className="font-semibold text-primary">
                            {formatCurrency(selectedClient.totalSpent ?? 0)}
                          </span>{' '}
                          total acumulado
                        </p>
                        <p className="text-sm text-slate-500">
                          Cliente desde{' '}
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {selectedClient.createdAt
                              ? format(new Date(selectedClient.createdAt), 'MMM yyyy', {
                                  locale: ptBR,
                                })
                              : '—'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Services / Charges List */}
                  <div className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Resumo de Gastos em Aberto
                      </h4>
                      {openChargesForClient.length > 0 && (
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                            checked={
                              openChargesForClient.length > 0 &&
                              openChargesForClient.every((c) => selectedIds.has(c.id))
                            }
                            onChange={selectAll}
                          />
                          <span className="text-xs font-medium text-slate-500">
                            Selecionar Tudo
                          </span>
                        </label>
                      )}
                    </div>
                    {openChargesForClient.length === 0 ? (
                      <p className="py-4 text-sm text-slate-500">
                        Nenhuma cobrança em aberto para esta cliente.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {openChargesForClient.map((c) => (
                          <label
                            key={c.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-4 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
                            )}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-primary focus:ring-primary"
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleCharge(c.id)}
                            />
                            <div className="grid flex-1 grid-cols-3 items-center gap-2 text-sm">
                              <span className="font-medium text-slate-600 dark:text-slate-400">
                                {formatDateRef(c.dueDate)}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {getChargeDescription(c)}
                              </span>
                              <span className="text-right font-bold text-slate-900 dark:text-white">
                                {formatCurrency(chargeAmountNumber(c.amount))}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    {openChargesForClient.length > 0 && (
                      <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-6 dark:border-slate-800">
                        <span className="font-medium text-slate-500">
                          Subtotal Selecionado
                        </span>
                        <span className="text-2xl font-black text-primary">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - PDF Preview & Actions */}
            <div className="col-span-12 space-y-6 lg:col-span-5">
              <div className="sticky top-8 rounded-xl border border-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h4 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                  Pré-visualização do PDF
                </h4>
                <div className="relative mb-6 flex aspect-[1/1.4] min-h-[320px] flex-col overflow-hidden rounded-lg border border-border bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-slate-900">
                  {(previewLoading || previewFetching) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/90 dark:bg-slate-900/90">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                  {previewError && !previewLoading && !previewFetching && (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Não foi possível gerar a pré-visualização. Verifique o n8n.
                      </p>
                      <p className="text-xs text-slate-500">
                        {(previewError as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                          (previewError as Error)?.message ??
                          'Erro ao chamar webhook'}
                      </p>
                    </div>
                  )}
                  {previewData && (previewData.pdfUrl || previewData.pdfBase64 || pdfBlobUrl) && !previewLoading && !previewFetching ? (
                    <iframe
                      title="Pré-visualização do PDF"
                      className="h-full w-full border-0"
                      src={
                        previewData.pdfUrl
                          ? previewData.pdfUrl
                          : pdfBlobUrl ?? `data:application/pdf;base64,${(previewData.pdfBase64 ?? '').replace(/\s/g, '')}`
                      }
                    />
                  ) : (
                    !previewLoading && !previewFetching && (
                      <div className="flex flex-col p-8">
                        <div className="mb-6 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded bg-primary">
                              <Scissors className="size-4 text-white" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-tighter">
                              Beleza Pro
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-bold uppercase text-slate-400">
                              Fatura #{selectedCharges.length > 0 ? '00452' : '—'}
                            </p>
                            <p className="text-[8px] text-slate-400">
                              Data: {format(new Date(), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="mb-6">
                          <p className="mb-1 text-[8px] font-bold uppercase text-slate-400">
                            Para:
                          </p>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {selectedClient?.name ?? '—'}
                          </p>
                          <p className="text-[8px] text-slate-500">
                            {selectedClient?.email ?? '—'}
                          </p>
                        </div>
                        <div className="flex-1">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-border dark:border-slate-700">
                                <th className="py-1 text-left text-[8px] font-bold uppercase text-slate-400">
                                  Item
                                </th>
                                <th className="py-1 text-right text-[8px] font-bold uppercase text-slate-400">
                                  Valor
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 dark:divide-slate-800">
                              {selectedCharges.map((c) => (
                                <tr key={c.id}>
                                  <td className="py-2 text-[10px] text-slate-700 dark:text-slate-300">
                                    {getChargeDescription(c)}
                                  </td>
                                  <td className="py-2 text-right text-[10px] text-slate-700 dark:text-slate-300">
                                    {formatCurrency(chargeAmountNumber(c.amount))}
                                  </td>
                                </tr>
                              ))}
                              {selectedCharges.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={2}
                                    className="py-4 text-center text-[10px] text-slate-400"
                                  >
                                    {canRequestPreview
                                      ? 'Clique em "Gerar PDF" para enviar os dados ao webhook'
                                      : 'Selecione uma cliente e itens em aberto'}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-auto flex items-center justify-between border-t-2 border-primary pt-4">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Total a Pagar
                          </span>
                          <span className="text-base font-black text-primary">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/10 to-transparent dark:from-black/10" />
                      </div>
                    )
                  )}
                </div>

                {toast && (
                  <p
                    className={cn(
                      'mb-3 text-sm',
                      toast.type === 'error' ? 'text-red-500' : 'text-emerald-600'
                    )}
                  >
                    {toast.message}
                  </p>
                )}
                <div className="space-y-3">
                  <Button
                    type="button"
                    className="w-full gap-2 py-4 font-bold bg-primary text-white hover:bg-primary/90"
                    disabled={!canRequestPreview || previewFetching}
                    onClick={() => refetchPreview()}
                  >
                    {previewFetching ? (
                      'Gerando PDF...'
                    ) : (
                      <>
                        <Scissors className="size-5" />
                        Gerar PDF
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    className="w-full py-4 font-bold text-white transition-transform active:scale-[0.98]"
                    style={{ backgroundColor: '#25D366' }}
                    disabled={selectedCharges.length === 0 || sendMutation.isPending}
                    onClick={() => sendMutation.mutate()}
                  >
                    {sendMutation.isPending ? (
                      'Enviando WhatsApp...'
                    ) : (
                      <>
                        <svg
                          className="size-6 shrink-0 fill-current"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        Enviar WhatsApp
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    className="w-full gap-2 py-3 font-bold bg-primary text-white hover:bg-primary/90"
                    disabled={selectedCharges.length === 0 || downloadMutation.isPending}
                    onClick={() => downloadMutation.mutate()}
                  >
                    <Download className="size-5" />
                    {downloadMutation.isPending ? 'Gerando PDF...' : 'Apenas Baixar PDF'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
