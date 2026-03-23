'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  Upload,
  Send,
  Download,
  FileText,
  Clock3,
  Plus,
  X,
  ArrowRight,
  Info,
  Search,
} from 'lucide-react';

import { api, postMultipart } from '@/lib/api';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export type ConsorcioParticipantForPdfs = {
  id: string;
  name: string;
  phone: string;
  status: 'elegivel' | 'sorteada';
  joinedAt: string;
};

type ConsorcioPdf = {
  id: string;
  title: string;
  fileName: string | null;
  mime: string;
  publicUrl: string | null;
  createdAt: string;
};

type PdfSendHistoryRow = {
  id: string;
  sentAt: string;
  revista: string;
  enviadaPara: string;
  status: 'pending' | 'sent' | 'failed';
};

type RecipientMode = 'winner' | 'specific' | 'client';

type LastDrawWinner = {
  drawId: string;
  drawnAt: string;
  participantId: string;
  clientId: string;
  name: string;
  phone: string;
};

function formatDateBr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDateTimeBr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pdfUploadErrorMessage(err: unknown): string {
  const ax = err as {
    response?: { data?: { error?: string; code?: string } };
    message?: string;
  };
  const apiErr = ax.response?.data?.error;
  const code = ax.response?.data?.code;
  if (apiErr) return code ? `${apiErr} [${code}]` : apiErr;
  return ax.message ?? 'Erro ao fazer upload.';
}

function pdfBrandBadge(title: string): { label: string; classes: string } {
  const t = title.toLowerCase();
  if (t.includes('tupperware')) {
    return {
      label: 'Tupperware',
      classes: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    };
  }
  if (t.includes('natura')) {
    return { label: 'Natura', classes: 'bg-amber-500/10 text-amber-700' };
  }
  if (t.includes('botic')) {
    return { label: 'Boticário', classes: 'bg-emerald-500/10 text-emerald-700' };
  }
  return { label: 'Revista', classes: 'bg-primary/10 text-primary' };
}

export function ConsorcioPdfsPanel({ participants }: { participants: ConsorcioParticipantForPdfs[] }) {
  const queryClient = useQueryClient();
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const [sendingPdfId, setSendingPdfId] = useState<string | null>(null);
  const [deletingPdfId, setDeletingPdfId] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalCategory, setModalCategory] = useState('');
  const [modalMonthRef, setModalMonthRef] = useState('');
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendModalPdf, setSendModalPdf] = useState<ConsorcioPdf | null>(null);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('winner');
  const [specificParticipantId, setSpecificParticipantId] = useState<string>('');
  const [specificSearch, setSpecificSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientMeta, setSelectedClientMeta] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

  const filteredParticipants = useMemo(() => {
    const q = specificSearch.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => p.name.toLowerCase().includes(q));
  }, [participants, specificSearch]);

  const pdfsQuery = useQuery({
    queryKey: ['consorcio', 'pdfs'],
    queryFn: () => api.get<{ pdfs: ConsorcioPdf[] }>('/consorcio/pdfs').then((r) => r.data),
  });

  const historyQuery = useQuery({
    queryKey: ['consorcio', 'pdfs', 'history'],
    queryFn: () =>
      api.get<{ rows: PdfSendHistoryRow[] }>('/consorcio/pdfs/history').then((r) => r.data),
  });

  const lastWinnerQuery = useQuery({
    queryKey: ['consorcio', 'last-draw-winner'],
    queryFn: () =>
      api.get<LastDrawWinner | null>('/consorcio/last-draw-winner').then((r) => r.data),
    enabled: sendModalOpen,
  });

  const clientsForRevistaQuery = useQuery({
    queryKey: ['clients', 'revista-send', clientSearch],
    queryFn: () =>
      api
        .get<{ items: { id: string; name: string; phone: string }[] }>('/clients', {
          params: {
            search: clientSearch.trim() || undefined,
            limit: '50',
          },
        })
        .then((r) => r.data),
    enabled: sendModalOpen && recipientMode === 'client',
  });

  const stats = useMemo(() => {
    const totalRevistas = pdfsQuery.data?.pdfs.length ?? 0;
    const rows = historyQuery.data?.rows ?? [];
    const currentMonth = monthKey(new Date().toISOString());
    const enviosMes = rows.filter((r) => r.status === 'sent' && monthKey(r.sentAt) === currentMonth).length;
    const latest = pdfsQuery.data?.pdfs[0]?.createdAt ?? null;
    return { totalRevistas, enviosMes, latest };
  }, [pdfsQuery.data?.pdfs, historyQuery.data?.rows]);

  const uploadMutation = useMutation({
    mutationFn: async (vars: {
      title?: string;
      category?: string;
      monthRef?: string;
      file: File;
    }) => {
      setUploadError(null);
      const file = vars.file;
      if (!file) throw new Error('Selecione um PDF para enviar.');
      if (participants.length === 0) {
        // Não bloqueia o upload, mas evita confusão com “enviar”.
      }
      const mime = file.type || 'application/pdf';
      if (mime !== 'application/pdf') {
        throw new Error('O arquivo precisa ser um PDF (mime application/pdf).');
      }

      const MAX_BYTES = 60 * 1024 * 1024; // 60MB
      if (file.size > MAX_BYTES) {
        throw new Error('PDF muito grande. Tente um arquivo de até 60MB.');
      }

      const parts = [vars.category?.trim(), vars.monthRef?.trim()].filter(Boolean);
      const generated = parts.length > 0 ? parts.join(' ') : '';
      const title = (vars.title?.trim() || generated || file.name.replace(/\.[^.]+$/, '').slice(0, 200) || 'Revista').slice(0, 200);

      const fd = new FormData();
      // Nome explícito no part (alguns proxies/nós esperam filename no Content-Disposition)
      fd.append('file', file, file.name);
      fd.append('title', title);
      if (vars.category?.trim()) fd.append('category', vars.category.trim());
      if (vars.monthRef?.trim()) fd.append('monthRef', vars.monthRef.trim());
      fd.append('fileName', file.name);
      fd.append('mime', mime);

      return postMultipart<{ id: string }>('/consorcio/pdfs', fd, { timeoutMs: 320_000 });
    },
    onSuccess: () => {
      setUploadFile(null);
      setUploadTitle('');
      setUploadError(null);
      setModalError(null);
      setModalTitle('');
      setModalCategory('');
      setModalMonthRef('');
      setModalFile(null);
      setAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['consorcio', 'pdfs'] });
    },
    onError: (err) => {
      const message = pdfUploadErrorMessage(err);
      setUploadError(message);
      setModalError(message);
    },
  });

  function sendWhatsAppErrorMessage(err: unknown): string {
    const ax = err as { response?: { data?: { error?: string } }; message?: string };
    return ax.response?.data?.error ?? ax.message ?? 'Falha ao enviar.';
  }

  const sendMutation = useMutation({
    mutationFn: async (vars: { pdfId: string; participantId: string; caption: string }) => {
      return api.post<{ ok: true }>(`/consorcio/pdfs/${vars.pdfId}/send-whatsapp`, {
        participantId: vars.participantId,
        caption: vars.caption,
      });
    },
    onSuccess: () => {
      setSendingPdfId(null);
      setSendError(null);
      queryClient.invalidateQueries({ queryKey: ['consorcio', 'pdfs', 'history'] });
    },
    onError: (err) => {
      setSendingPdfId(null);
      setSendError(sendWhatsAppErrorMessage(err));
    },
  });

  const sendClientWebhookMutation = useMutation({
    mutationFn: async (vars: { pdfId: string; clientId: string; caption: string }) => {
      return api.post<{ ok: true }>(`/consorcio/pdfs/${vars.pdfId}/send-to-client-webhook`, {
        clientId: vars.clientId,
        caption: vars.caption,
      });
    },
    onSuccess: () => {
      setSendingPdfId(null);
      setSendError(null);
      queryClient.invalidateQueries({ queryKey: ['consorcio', 'pdfs', 'history'] });
    },
    onError: (err) => {
      setSendingPdfId(null);
      setSendError(sendWhatsAppErrorMessage(err));
    },
  });

  const specificChosen = useMemo(
    () => participants.find((p) => p.id === specificParticipantId) ?? null,
    [participants, specificParticipantId]
  );

  async function handleSendFromModal() {
    if (!sendModalPdf) return;
    setSendError(null);
    const caption = `Revista: ${sendModalPdf.title}`;

    if (recipientMode === 'winner') {
      const w = lastWinnerQuery.data;
      if (lastWinnerQuery.isLoading) {
        setSendError('Carregando dados da última ganhadora…');
        return;
      }
      if (!w?.participantId) {
        setSendError(
          'Não foi possível identificar a ganhadora do último sorteio. Verifique o histórico de sorteios ou escolha outra opção.'
        );
        return;
      }
      setSendingPdfId(sendModalPdf.id);
      try {
        await sendMutation.mutateAsync({
          pdfId: sendModalPdf.id,
          participantId: w.participantId,
          caption,
        });
        closeSendModalSuccess();
      } catch (err) {
        setSendError(sendWhatsAppErrorMessage(err));
      } finally {
        setSendingPdfId(null);
      }
      return;
    }

    if (recipientMode === 'specific') {
      const found = participants.find((p) => p.id === specificParticipantId);
      if (!found) {
        setSendError('Selecione uma participante do consórcio.');
        return;
      }
      setSendingPdfId(sendModalPdf.id);
      try {
        await sendMutation.mutateAsync({
          pdfId: sendModalPdf.id,
          participantId: found.id,
          caption,
        });
        closeSendModalSuccess();
      } catch (err) {
        setSendError(sendWhatsAppErrorMessage(err));
      } finally {
        setSendingPdfId(null);
      }
      return;
    }

    if (!selectedClientMeta?.id) {
      setSendError('Selecione um cliente do cadastro.');
      return;
    }
    setSendingPdfId(sendModalPdf.id);
    try {
      await sendClientWebhookMutation.mutateAsync({
        pdfId: sendModalPdf.id,
        clientId: selectedClientMeta.id,
        caption,
      });
      closeSendModalSuccess();
    } catch (err) {
      setSendError(sendWhatsAppErrorMessage(err));
    } finally {
      setSendingPdfId(null);
    }
  }

  function closeSendModalSuccess() {
    setSendModalOpen(false);
    setSendModalPdf(null);
    setSpecificSearch('');
    setSpecificParticipantId('');
    setClientSearch('');
    setSelectedClientMeta(null);
    setRecipientMode('winner');
    setSendError(null);
  }

  const deleteMutation = useMutation({
    mutationFn: async (pdfId: string) => api.delete(`/consorcio/pdfs/${pdfId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consorcio', 'pdfs'] }),
  });

  const downloadMutation = useMutation({
    mutationFn: async (pdfId: string) =>
      api
        .get<{
          id: string;
          title: string;
          fileName: string | null;
          mime: string;
          publicUrl: string | null;
          pdfBase64: string | null;
        }>(`/consorcio/pdfs/${pdfId}/download`)
        .then((r) => r.data),
  });

  const handleDownload = async (pdfId: string) => {
    const data = await downloadMutation.mutateAsync(pdfId);
    const pub = data.publicUrl?.trim();
    if (pub) {
      window.open(pub, '_blank', 'noopener,noreferrer');
      return;
    }
    const base64 = (data.pdfBase64 ?? '').replace(/\s/g, '');
    if (!base64) {
      throw new Error('Revista sem URL pública nem arquivo para baixar.');
    }
    const a = document.createElement('a');
    a.href = `data:${data.mime || 'application/pdf'};base64,${base64}`;
    a.download = data.fileName?.trim() || `${data.title}.pdf`;
    a.click();
  };

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-border/50 bg-app-surface p-5 shadow-sm">
          <div className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="size-6" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">Total de Revistas</p>
          <h3 className="mt-1 text-3xl font-black text-ink-primary">{stats.totalRevistas}</h3>
        </article>
        <article className="rounded-3xl border border-border/50 bg-app-surface p-5 shadow-sm">
          <div className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700">
            <Send className="size-6" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">Envios este mês</p>
          <h3 className="mt-1 text-3xl font-black text-ink-primary">{stats.enviosMes}</h3>
        </article>
        <article className="rounded-3xl border border-border/50 bg-app-surface p-5 shadow-sm">
          <div className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700">
            <Clock3 className="size-6" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">Última atualização</p>
          <h3 className="mt-1 text-xl font-black text-ink-primary">
            {stats.latest ? formatDateBr(stats.latest) : '—'}
          </h3>
        </article>
      </section>

      <section className="space-y-5 rounded-3xl border border-border/60 bg-app-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-primary">Gerenciar Revistas</h2>
            <p className="text-sm text-ink-secondary">
              Catálogos disponíveis para compartilhamento com o consórcio.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-[auto] lg:w-auto">
            <Button
              type="button"
              onClick={() => {
                setModalError(null);
                setAddModalOpen(true);
              }}
              className="h-11 rounded-xl bg-gradient-to-br from-primary to-primary-hover px-6 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:opacity-95"
            >
              <Plus className="size-4" />
              Adicionar Revista
            </Button>
          </div>
        </div>

        {uploadError && <p className="text-sm text-amber-700">{uploadError}</p>}
        {sendError && <p className="text-sm text-amber-700">{sendError}</p>}

        {pdfsQuery.isLoading && <p className="text-sm text-ink-muted">Carregando catálogos…</p>}
        {pdfsQuery.isError && <p className="text-sm text-danger">Erro ao carregar catálogos.</p>}
        {pdfsQuery.data?.pdfs.length === 0 && !pdfsQuery.isLoading && (
          <p className="text-sm text-ink-secondary">Nenhuma revista enviada ainda.</p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pdfsQuery.data?.pdfs.map((pdf) => {
            const badge = pdfBrandBadge(pdf.title);
            return (
              <article
                key={pdf.id}
                className="rounded-3xl border border-border/70 bg-app-bg p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="inline-flex h-20 w-16 flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 text-primary">
                    <FileText className="size-8" />
                    <span className="mt-1 text-[8px] font-black">PDF</span>
                  </div>
                  <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-black uppercase', badge.classes)}>
                    {badge.label}
                  </span>
                </div>
                <h4 className="truncate text-lg font-bold text-ink-primary">{pdf.title}</h4>
                <p className="mb-4 text-xs text-ink-secondary">
                  {formatDateBr(pdf.createdAt)} {pdf.fileName ? `• ${pdf.fileName}` : ''}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={sendingPdfId === pdf.id}
                    onClick={() => {
                      setSendError(null);
                      setSendModalPdf(pdf);
                      setRecipientMode('winner');
                      setSpecificParticipantId('');
                      setSpecificSearch('');
                      setSelectedClientMeta(null);
                      setClientSearch('');
                      setSendModalOpen(true);
                    }}
                    className="flex flex-col items-center gap-1 rounded-xl p-2 text-emerald-700 transition-colors hover:bg-emerald-500/10 disabled:opacity-40"
                  >
                    <Send className="size-[15px]" />
                    <span className="text-[9px] font-bold">Enviar</span>
                  </button>
                  <button
                    type="button"
                    disabled={downloadMutation.isPending}
                    onClick={() => handleDownload(pdf.id)}
                    className="flex flex-col items-center gap-1 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-200/50 disabled:opacity-40"
                  >
                    <Download className="size-[15px]" />
                    <span className="text-[9px] font-bold">Baixar</span>
                  </button>
                  <button
                    type="button"
                    disabled={deletingPdfId === pdf.id}
                    onClick={() => {
                      setDeletingPdfId(pdf.id);
                      deleteMutation.mutate(pdf.id, {
                        onSuccess: () => setDeletingPdfId(null),
                        onError: () => setDeletingPdfId(null),
                      });
                    }}
                    className="flex flex-col items-center gap-1 rounded-xl p-2 text-danger transition-colors hover:bg-danger-light/40 disabled:opacity-40"
                  >
                    <Trash2 className="size-[15px]" />
                    <span className="text-[9px] font-bold">Excluir</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border/60 bg-app-surface shadow-sm">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-bold tracking-tight text-ink-primary">Histórico de Envios</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-app-bg/70">
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary">Data</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary">Revista</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary">Enviada para</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {historyQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-sm text-ink-secondary">
                    Carregando histórico…
                  </td>
                </tr>
              )}
              {!historyQuery.isLoading && (historyQuery.data?.rows.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-sm text-ink-secondary">
                    Nenhum envio de revista registrado ainda.
                  </td>
                </tr>
              )}
              {historyQuery.data?.rows.map((row) => {
                const badge = pdfBrandBadge(row.revista);
                return (
                <tr key={row.id} className="hover:bg-app-bg/50">
                  <td className="px-6 py-4 text-sm text-ink-secondary">{formatDateTimeBr(row.sentAt)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-ink-primary">{row.revista}</td>
                  <td className="px-6 py-4">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', badge.classes)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-primary">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                        {initials(row.enviadaPara)}
                      </span>
                      <span>{row.enviadaPara}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase',
                        row.status === 'sent' && 'bg-emerald-500/15 text-emerald-800',
                        row.status === 'failed' && 'bg-danger-light text-danger',
                        row.status === 'pending' && 'bg-primary/10 text-primary'
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {row.status === 'sent' ? 'Enviado' : row.status === 'failed' ? 'Erro' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>

      {sendModalOpen && sendModalPdf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-app-surface shadow-[0_12px_40px_rgba(15,15,18,0.12)]">
            <div className="flex shrink-0 items-start justify-between border-b border-outline-variant/10 px-6 py-5">
              <div>
                <h3 className="text-[1.125rem] font-bold tracking-tight text-primary">
                  Enviar Revista
                </h3>
                <p className="mt-0.5 text-[13px] text-ink-secondary">
                  {sendModalPdf.title} {sendModalPdf.fileName ? `· ${sendModalPdf.fileName}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 text-ink-secondary transition-colors hover:bg-app-bg"
                onClick={() => {
                  setSendModalOpen(false);
                  setSendModalPdf(null);
                  setSpecificSearch('');
                  setSpecificParticipantId('');
                  setClientSearch('');
                  setSelectedClientMeta(null);
                }}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
              <span className="mb-4 block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                Destinatário
              </span>
              <div className="space-y-4">
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all',
                    recipientMode === 'winner'
                      ? 'border-2 border-primary bg-primary-muted/60'
                      : 'border-border/30 bg-app-bg/60 hover:bg-app-bg'
                  )}
                >
                  <input
                    type="radio"
                    name="recipient"
                    checked={recipientMode === 'winner'}
                    onChange={() => {
                      setRecipientMode('winner');
                      setSelectedClientMeta(null);
                    }}
                    className="mt-0.5 h-4 w-4 border-outline text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.875rem] font-semibold text-ink-primary">
                        Para a ganhadora do último sorteio
                      </span>
                      {lastWinnerQuery.data && (
                        <span className="truncate rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-white">
                          {lastWinnerQuery.data.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-secondary">
                      {lastWinnerQuery.isLoading && 'Carregando…'}
                      {!lastWinnerQuery.isLoading && lastWinnerQuery.data && (
                        <>
                          Sorteio em {formatDateBr(lastWinnerQuery.data.drawnAt)}. Envio para a
                          participante vinculada ao consórcio.
                        </>
                      )}
                      {!lastWinnerQuery.isLoading && !lastWinnerQuery.data && (
                        <>Nenhum sorteio registrado ainda. Use a aba Consórcio para sortear.</>
                      )}
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all',
                    recipientMode === 'specific'
                      ? 'border-2 border-primary bg-primary-muted/60'
                      : 'border-border/30 bg-app-bg/60 hover:bg-app-bg'
                  )}
                >
                  <input
                    type="radio"
                    name="recipient"
                    checked={recipientMode === 'specific'}
                    onChange={() => {
                      setRecipientMode('specific');
                      setSelectedClientMeta(null);
                    }}
                    className="mt-0.5 h-4 w-4 border-outline text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[0.875rem] font-semibold text-ink-primary">
                      Para uma participante do consórcio
                    </span>
                    {recipientMode === 'specific' &&
                      (specificParticipantId && specificChosen ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-app-surface px-3 py-2">
                          <span className="text-sm font-medium text-ink-primary">
                            {specificChosen.name}
                          </span>
                          <button
                            type="button"
                            className="text-xs font-bold text-primary underline"
                            onClick={(e) => {
                              e.preventDefault();
                              setSpecificParticipantId('');
                              setSpecificSearch('');
                            }}
                          >
                            Trocar
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative mt-3">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
                            <input
                              type="text"
                              value={specificSearch}
                              onChange={(e) => setSpecificSearch(e.target.value)}
                              placeholder="Buscar entre as participantes do ciclo…"
                              className="w-full rounded-lg border border-border/60 bg-app-surface py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-border/40 bg-app-surface">
                            {filteredParticipants.length === 0 ? (
                              <p className="p-3 text-xs text-ink-secondary">
                                Nenhuma participante encontrada.
                              </p>
                            ) : (
                              filteredParticipants.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm text-ink-primary transition-colors hover:bg-app-bg"
                                  onClick={() => {
                                    setSpecificParticipantId(p.id);
                                    setSpecificSearch('');
                                  }}
                                >
                                  {p.name}
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      ))}
                  </div>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all',
                    recipientMode === 'client'
                      ? 'border-2 border-primary bg-primary-muted/60'
                      : 'border-border/30 bg-app-bg/60 hover:bg-app-bg'
                  )}
                >
                  <input
                    type="radio"
                    name="recipient"
                    checked={recipientMode === 'client'}
                    onChange={() => {
                      setRecipientMode('client');
                      setSpecificParticipantId('');
                      setSpecificSearch('');
                    }}
                    className="mt-0.5 h-4 w-4 border-outline text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[0.875rem] font-semibold text-ink-primary">
                      Qualquer cliente
                    </span>
                    <p className="mt-0.5 text-[12px] text-ink-secondary">
                      Escolha alguém do cadastro em Clientes — não precisa estar neste ciclo do consórcio.
                    </p>
                    {recipientMode === 'client' &&
                      (selectedClientMeta ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-app-surface px-3 py-2">
                          <span className="text-sm font-medium text-ink-primary">
                            {selectedClientMeta.name}
                          </span>
                          <span className="text-xs text-ink-secondary">{selectedClientMeta.phone}</span>
                          <button
                            type="button"
                            className="text-xs font-bold text-primary underline"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedClientMeta(null);
                              setClientSearch('');
                            }}
                          >
                            Trocar
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative mt-3">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
                            <input
                              type="text"
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              placeholder="Buscar no cadastro de clientes…"
                              className="w-full rounded-lg border border-border/60 bg-app-surface py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-border/40 bg-app-surface">
                            {clientsForRevistaQuery.isLoading && (
                              <p className="p-3 text-xs text-ink-secondary">Carregando clientes…</p>
                            )}
                            {!clientsForRevistaQuery.isLoading &&
                              (clientsForRevistaQuery.data?.items.length ?? 0) === 0 && (
                                <p className="p-3 text-xs text-ink-secondary">
                                  Nenhum cliente encontrado. Cadastre em Clientes.
                                </p>
                              )}
                            {clientsForRevistaQuery.data?.items.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm text-ink-primary transition-colors hover:bg-app-bg"
                                onClick={() => {
                                  setSelectedClientMeta({
                                    id: c.id,
                                    name: c.name,
                                    phone: c.phone,
                                  });
                                  setClientSearch('');
                                }}
                              >
                                <span className="font-medium">{c.name}</span>
                                <span className="ml-2 text-xs text-ink-secondary">{c.phone}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      ))}
                  </div>
                </label>
              </div>

              <div className="mt-6 flex gap-3 rounded-xl border border-border/40 bg-app-bg/80 p-4">
                <Info className="size-5 shrink-0 text-ink-secondary" />
                <p className="text-[13px] leading-snug text-ink-secondary">
                  {recipientMode === 'client'
                    ? 'Ao confirmar, a revista será enviada para o contato que você escolheu, usando o canal de envio configurado para o salão.'
                    : 'Ao confirmar, a revista será enviada para a destinatária selecionada, no número cadastrado.'}
                </p>
              </div>
              {sendError && <p className="mt-4 text-sm text-amber-700">{sendError}</p>}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-app-bg px-6 py-5">
              <button
                type="button"
                className="h-10 flex-1 rounded-lg border border-border bg-app-surface px-4 text-sm font-semibold text-ink-primary transition-colors hover:bg-app-bg"
                onClick={() => {
                  setSendModalOpen(false);
                  setSendModalPdf(null);
                  setSpecificSearch('');
                  setSpecificParticipantId('');
                  setClientSearch('');
                  setSelectedClientMeta(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  sendingPdfId === sendModalPdf.id ||
                  (recipientMode === 'winner' &&
                    (lastWinnerQuery.isLoading || !lastWinnerQuery.data?.participantId)) ||
                  (recipientMode === 'specific' && !specificParticipantId) ||
                  (recipientMode === 'client' && !selectedClientMeta)
                }
                onClick={handleSendFromModal}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
              >
                {sendingPdfId === sendModalPdf.id ? 'Enviando...' : 'Enviar agora'}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {addModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between px-8 py-6">
              <div>
                <h2 className="text-[22px] font-bold tracking-tight text-[#b90061]">
                  Adicionar Revista
                </h2>
                <p className="mt-1 text-[14px] text-slate-500">
                  Preencha os dados da nova revista
                </p>
              </div>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                onClick={() => {
                  setAddModalOpen(false);
                  setModalError(null);
                }}
                aria-label="Fechar modal"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-8 pb-6">
              <div className="space-y-2">
                <label className="text-[0.75rem] font-bold uppercase tracking-widest text-slate-700">
                  Nome da Revista*
                </label>
                <input
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="h-12 w-full rounded-xl border-transparent bg-app-bg px-4 text-sm placeholder:text-slate-400 transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  placeholder="ex: Tupperware Março 2026"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[0.75rem] font-bold uppercase tracking-widest text-slate-700">
                    Categoria*
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="h-12 w-full appearance-none rounded-xl border-transparent bg-app-bg px-4 text-sm transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Selecione uma opção</option>
                    <option value="Tupperware">Tupperware</option>
                    <option value="Natura">Natura</option>
                    <option value="Boticário">Boticário</option>
                    <option value="Eudora">Eudora</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[0.75rem] font-bold uppercase tracking-widest text-slate-700">
                    Mês de Referência*
                  </label>
                  <input
                    value={modalMonthRef}
                    onChange={(e) => setModalMonthRef(e.target.value)}
                    className="h-12 w-full rounded-xl border-transparent bg-app-bg px-4 text-sm placeholder:text-slate-400 transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    placeholder="03/2026"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[0.75rem] font-bold uppercase tracking-widest text-slate-700">
                  Arquivo PDF*
                </label>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setModalFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#e4e1e6] bg-app-bg p-8 transition-colors hover:bg-[#f0edf1]"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#ffd9e2] text-[#b90061] transition-transform group-hover:scale-110">
                    <Upload className="size-7" />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-semibold text-ink-primary">
                      Clique para subir ou arraste o arquivo
                    </p>
                    <p className="mt-1 text-[12px] text-ink-secondary">
                      Somente PDF, máx 60MB
                    </p>
                    {modalFile && (
                      <p className="mt-2 text-[12px] font-semibold text-primary">
                        {modalFile.name}
                      </p>
                    )}
                  </div>
                </button>
              </div>

              {modalError && (
                <p className="text-sm text-amber-700">{modalError}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-row-reverse gap-3 border-t border-outline-variant/10 bg-surface-container-low/50 px-8 py-6">
              <button
                type="button"
                disabled={uploadMutation.isPending}
                onClick={() => {
                  setModalError(null);
                  if (!modalFile) {
                    setModalError('Selecione um arquivo PDF.');
                    return;
                  }
                  if (!modalTitle.trim()) {
                    setModalError('Informe o nome da revista.');
                    return;
                  }
                  if (!modalCategory.trim()) {
                    setModalError('Selecione a categoria.');
                    return;
                  }
                  if (!modalMonthRef.trim()) {
                    setModalError('Informe o mês de referência.');
                    return;
                  }
                  uploadMutation.mutate({
                    title: modalTitle.trim(),
                    category: modalCategory.trim(),
                    monthRef: modalMonthRef.trim(),
                    file: modalFile,
                  });
                }}
                className="h-12 rounded-xl bg-gradient-to-br from-[#b90061] to-[#e11d7a] px-8 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95 disabled:opacity-60"
              >
                {uploadMutation.isPending ? 'Salvando...' : 'Salvar Revista'}
              </button>
              <button
                type="button"
                className="h-12 rounded-xl px-8 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200/50"
                onClick={() => {
                  setAddModalOpen(false);
                  setModalError(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

