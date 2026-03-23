'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  Handshake,
  MessageCircle,
  PlayCircle,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings2,
  Loader2,
  Sparkles,
  Trash2,
  UserCircle2,
  Users,
} from 'lucide-react';

import { AddParticipantModal } from '@/components/consorcio/AddParticipantModal';
import { ConsorcioPdfsPanel } from '@/components/consorcio/ConsorcioPdfsPanel';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { cn, avatarClassForInitial } from '@/lib/utils';

type ParticipantStatus = 'elegivel' | 'sorteada';

type Participant = {
  id: string;
  name: string;
  phone: string;
  status: ParticipantStatus;
  joinedAt: string;
};

type DrawN8nAutomation = {
  videoGenerated?: boolean;
  whatsappSent?: boolean;
  workflowSuccess?: boolean;
  detailMessage?: string;
  atualizadoEm: string;
};

type DrawHistoryRow = {
  id: string;
  date: string;
  winnerName: string;
  participantCount: number;
  triggeredBy: 'automatico' | 'manual';
  videoUrl?: string | null;
  hasVideoPreview: boolean;
  whatsappDispatchPending: boolean;
  automation?: DrawN8nAutomation;
};

type ConsorcioOverview = {
  settings: {
    cycleName: string;
    drawDayOfMonth: number;
    reminderDayOfMonth: number;
    reminderTime: string;
  };
  nextDrawDate: string;
  participants: Participant[];
  draws: DrawHistoryRow[];
};

type SelectablePdf = {
  id: string;
  title: string;
  fileName: string | null;
  publicUrl?: string | null;
};

/** Modal do sorteio: abre no clique, loading até o webhook n8n responder. */
type DrawResultModalState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | {
      phase: 'ready';
      sorteioId: string;
      winnerName: string;
      videoUrl: string | null;
      hasVideoPreview: boolean;
      whatsappDispatchPending: boolean;
    };

function apiErrorMessage(err: unknown): string {
  const d = (err as { response?: { data?: { error?: string; code?: string } } })?.response
    ?.data;
  const msg = d?.error ?? 'Não foi possível concluir o sorteio. Tente novamente.';
  const code = d?.code;
  return code ? `${msg} [${code}]` : msg;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function whatsappHref(phoneDigits: string): string {
  const d = phoneDigits.replace(/\D/g, '');
  if (!d) return '#';
  return `https://wa.me/55${d}`;
}

function formatPhoneBr(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return digits;
}

/** Alinha com a API: GIF em base64 não pode ser exibido em <video>. */
function inferMediaMimeFromBase64Client(base64: string): string | undefined {
  const clean = base64.replace(/\s/g, '');
  if (clean.length < 12) return undefined;
  const head = clean.slice(0, 24);
  if (head.startsWith('R0lGOD')) return 'image/gif';
  if (head.startsWith('/9j/')) return 'image/jpeg';
  if (head.startsWith('iVBORw0KGgo')) return 'image/png';
  if (head.startsWith('UklGR')) return 'image/webp';
  try {
    const raw = atob(clean.slice(0, 48));
    if (raw.length >= 12 && raw.slice(4, 8) === 'ftyp') return 'video/mp4';
    if (raw.startsWith('\x1a\x45\xdf\xa3')) return 'video/webm';
  } catch {
    /* ignore */
  }
  return undefined;
}

/** data:image/…, URL .gif/.png… ou path que indica imagem (não usar <video> para GIF). */
function isProbablyImageMediaSrc(src: string): boolean {
  const s = src.trim().toLowerCase();
  if (s.startsWith('data:image/')) return true;
  return /\.(gif|png|jpe?g|webp)(\?|#|$)/i.test(s);
}

/** Decodifica base64 (API) para Blob — evita data URLs gigantes que o Chrome costuma falhar com GIF. */
function base64ToBlob(base64: string, mime: string): Blob {
  const clean = base64.replace(/\s/g, '');
  const binary = atob(clean);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}

function DrawMediaPreview({
  src,
  variant,
  onImageError,
  onVideoError,
}: {
  src: string;
  variant: 'image' | 'video';
  onImageError?: () => void;
  onVideoError?: () => void;
}) {
  const box = 'max-h-[min(70vh,480px)] w-full rounded-xl bg-black/40 object-contain';
  if (variant === 'image') {
    return (
      <img
        src={src}
        alt=""
        role="presentation"
        decoding="async"
        className={box}
        onError={() => onImageError?.()}
      />
    );
  }
  return (
    <video
      src={src}
      controls
      playsInline
      className="aspect-video w-full rounded-xl bg-black/80"
      onError={() => onVideoError?.()}
    >
      <track kind="captions" />
    </video>
  );
}

function DrawAutomationStatus({ row }: { row: DrawHistoryRow }) {
  const a = row.automation;
  const hasVideoLink = Boolean(row.videoUrl?.trim());
  const videoOk = hasVideoLink || a?.videoGenerated === true;
  const videoFail = a?.videoGenerated === false && !hasVideoLink;
  const waOk = a?.whatsappSent === true;
  const waFail = a?.whatsappSent === false;
  const onlyFlow = a?.workflowSuccess === true && a.videoGenerated === undefined && a.whatsappSent === undefined;

  if (!a && !hasVideoLink) {
    return <span className="text-xs text-ink-muted">—</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1">
        {videoOk && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-800"
            title={a?.detailMessage ?? 'Vídeo gerado ou URL recebida'}
          >
            <PlayCircle className="size-3" aria-hidden />
            Vídeo
          </span>
        )}
        {videoFail && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-900">
            Vídeo não
          </span>
        )}
        {waOk && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-800"
            title={a?.detailMessage ?? 'Mensagem enviada'}
          >
            <MessageCircle className="size-3" aria-hidden />
            WhatsApp
          </span>
        )}
        {waFail && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-900">
            Msg não
          </span>
        )}
        {onlyFlow && !videoOk && !waOk && (
          <span className="rounded-full bg-primary-muted px-2 py-0.5 text-[10px] font-bold text-primary-hover">
            Automação OK
          </span>
        )}
      </div>
      {a?.detailMessage &&
        !videoOk &&
        !videoFail &&
        !waOk &&
        !waFail &&
        !onlyFlow && (
          <span
            className="max-w-[160px] truncate text-[10px] text-ink-secondary"
            title={a.detailMessage}
          >
            {a.detailMessage}
          </span>
        )}
      {!videoOk && !videoFail && !waOk && !waFail && !onlyFlow && hasVideoLink && (
        <span className="text-[10px] text-ink-muted">Só link (sem flags n8n)</span>
      )}
    </div>
  );
}

export default function ConsorcioPage() {
  const queryClient = useQueryClient();
  const [consorcioSubmenu, setConsorcioSubmenu] = useState<'consorcio' | 'revistas'>('consorcio');
  const [search, setSearch] = useState('');
  const [drawDay, setDrawDay] = useState('10');
  const [reminderDay, setReminderDay] = useState('20');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [drawN8nWarning, setDrawN8nWarning] = useState<string | null>(null);
  const [drawResultModal, setDrawResultModal] = useState<DrawResultModalState | null>(null);
  /** Revistas marcadas no modal “Sorteio concluído” para ir no webhook de envio ao WhatsApp. */
  const [drawSendRevistaIds, setDrawSendRevistaIds] = useState<string[]>([]);
  /** URL http(s), blob: (preview API) ou data: (fallback). */
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [previewIsImage, setPreviewIsImage] = useState(false);
  const [previewLoadError, setPreviewLoadError] = useState<string | null>(null);
  /** Esconde <img>/<video> após falha — evita ícone de imagem quebrada sem mensagem. */
  const [previewMediaFailed, setPreviewMediaFailed] = useState(false);
  const previewBlobRef = useRef<string | null>(null);
  /** `videoUrl` data:… → blob: (Chrome costuma falhar com data URLs gigantes no atributo src). */
  const videoDataUrlBlobRef = useRef<string | null>(null);
  const [resolvedVideoBlobUrl, setResolvedVideoBlobUrl] = useState<string | null>(null);
  const [resolvedVideoIsImage, setResolvedVideoIsImage] = useState(false);
  /** Se a usuária fechar o modal durante o loading, não reabrimos no sucesso. */
  const drawModalDismissedDuringLoadRef = useRef(false);

  const revokePreviewBlob = () => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
  };

  const revokeVideoDataUrlBlob = () => {
    if (videoDataUrlBlobRef.current) {
      URL.revokeObjectURL(videoDataUrlBlobRef.current);
      videoDataUrlBlobRef.current = null;
    }
    setResolvedVideoBlobUrl(null);
    setResolvedVideoIsImage(false);
  };

  const clearPreviewMedia = () => {
    revokePreviewBlob();
    revokeVideoDataUrlBlob();
    setPreviewMediaUrl(null);
    setPreviewIsImage(false);
  };

  const {
    data: overview,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['consorcio'],
    queryFn: () => api.get<ConsorcioOverview>('/consorcio').then((r) => r.data),
  });
  const pdfsQuery = useQuery({
    queryKey: ['consorcio', 'pdfs'],
    queryFn: () =>
      api.get<{ pdfs: SelectablePdf[] }>('/consorcio/pdfs').then((r) => r.data),
  });

  useEffect(() => {
    if (!overview || settingsDirty) return;
    setDrawDay(String(overview.settings.drawDayOfMonth));
    setReminderDay(String(overview.settings.reminderDayOfMonth));
    setReminderTime(overview.settings.reminderTime);
  }, [overview, settingsDirty]);

  const participants = overview?.participants ?? [];
  const draws = overview?.draws ?? [];
  const cycleName = overview?.settings.cycleName ?? 'Ciclo atual';
  const nextDrawDate = overview?.nextDrawDate
    ? new Date(overview.nextDrawDate)
    : new Date();

  const stats = useMemo(() => {
    const total = participants.length;
    const elegiveis = participants.filter((p) => p.status === 'elegivel').length;
    const sorteadas = participants.filter((p) => p.status === 'sorteada').length;
    return { total, elegiveis, sorteadas };
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => p.name.toLowerCase().includes(q));
  }, [search, participants]);

  const patchSettingsMutation = useMutation({
    mutationFn: (body: {
      drawDayOfMonth: number;
      reminderDayOfMonth: number;
      reminderTime: string;
      /** Sempre vazio: revistas só no modal após o sorteio. */
      selectedPdfIds: string[];
    }) => api.patch('/consorcio/settings', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consorcio'] });
      setSettingsDirty(false);
    },
  });

  const drawMutation = useMutation({
    mutationFn: () =>
      api.post<{
        winnerParticipantId: string;
        winnerName: string;
        participantCount: number;
        sorteioId: string;
        videoUrl?: string | null;
        hasVideoPreview: boolean;
        whatsappDispatchPending: boolean;
        n8nMessage?: string;
        automation?: DrawN8nAutomation;
      }>('/consorcio/draw', { triggeredBy: 'manual' }),
    onMutate: () => {
      drawModalDismissedDuringLoadRef.current = false;
      setDrawN8nWarning(null);
      clearPreviewMedia();
      setPreviewLoadError(null);
      setPreviewMediaFailed(false);
      setDrawResultModal({ phase: 'loading' });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['consorcio'] });
      const d = res.data;
      if (!d) {
        if (!drawModalDismissedDuringLoadRef.current) {
          setDrawResultModal({
            phase: 'error',
            message: 'Resposta inválida da API.',
          });
        }
        return;
      }
      if (drawModalDismissedDuringLoadRef.current) {
        return;
      }
      setDrawResultModal({
        phase: 'ready',
        sorteioId: d.sorteioId,
        winnerName: d.winnerName,
        videoUrl: d.videoUrl ?? null,
        hasVideoPreview: d.hasVideoPreview,
        whatsappDispatchPending: d.whatsappDispatchPending,
      });
      clearPreviewMedia();
      setPreviewLoadError(null);
      setPreviewMediaFailed(false);
    },
    onError: (err) => {
      if (!drawModalDismissedDuringLoadRef.current) {
        setDrawResultModal({ phase: 'error', message: apiErrorMessage(err) });
      }
    },
  });

  const drawReadySorteioKey =
    drawResultModal?.phase === 'ready' ? drawResultModal.sorteioId : null;

  useEffect(() => {
    if (drawResultModal?.phase === 'ready') {
      setDrawSendRevistaIds([]);
    }
  }, [drawResultModal?.phase, drawReadySorteioKey]);

  const sendWhatsappMutation = useMutation({
    mutationFn: (vars: { drawId: string; revistaPdfIds: string[] }) =>
      api.post<{ ok: true; n8nMessage?: string }>(
        `/consorcio/draws/${vars.drawId}/send-whatsapp`,
        { revistaPdfIds: vars.revistaPdfIds }
      ),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['consorcio'] });
      setDrawResultModal((prev) =>
        prev?.phase === 'ready' && prev.sorteioId === vars.drawId
          ? { ...prev, whatsappDispatchPending: false }
          : prev
      );
    },
  });

  const closeDrawResultModal = () => {
    sendWhatsappMutation.reset();
    setDrawResultModal(null);
    setDrawSendRevistaIds([]);
    clearPreviewMedia();
    setPreviewLoadError(null);
    setPreviewMediaFailed(false);
  };

  function toggleDrawSendRevista(pdfId: string) {
    setDrawSendRevistaIds((prev) =>
      prev.includes(pdfId) ? prev.filter((id) => id !== pdfId) : [...prev, pdfId]
    );
  }

  const readyRawVideoUrl =
    drawResultModal?.phase === 'ready' ? (drawResultModal.videoUrl?.trim() ?? '') : '';

  /** Converte `videoUrl` data:… em blob: (evita <img> quebrado com strings enormes). */
  useEffect(() => {
    if (drawResultModal?.phase !== 'ready') {
      revokeVideoDataUrlBlob();
      return;
    }
    const raw = drawResultModal.videoUrl?.trim() ?? '';
    if (!raw.startsWith('data:')) {
      revokeVideoDataUrlBlob();
      return;
    }
    let cancelled = false;
    setPreviewMediaFailed(false);
    const m = /^data:([^;]+);base64,([\s\S]+)$/i.exec(raw);
    if (!m) {
      setPreviewLoadError(
        'O videoUrl não é um data URL válido. No n8n, use os campos gif_base64 / videoBase64 (recomendado) em vez de colocar o arquivo inteiro em videoUrl.'
      );
      setPreviewMediaFailed(true);
      return;
    }
    try {
      const mime = m[1].trim().toLowerCase();
      const blob = base64ToBlob(m[2], mime);
      const url = URL.createObjectURL(blob);
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      revokeVideoDataUrlBlob();
      videoDataUrlBlobRef.current = url;
      setResolvedVideoBlobUrl(url);
      setResolvedVideoIsImage(mime.startsWith('image/'));
      setPreviewLoadError(null);
    } catch {
      if (!cancelled) {
        setPreviewLoadError(
          'Não foi possível decodificar a mídia (base64 inválido ou truncado). Use gif_base64 na resposta do n8n.'
        );
        setPreviewMediaFailed(true);
      }
    }
    return () => {
      cancelled = true;
      revokeVideoDataUrlBlob();
    };
  }, [drawResultModal?.phase, readyRawVideoUrl]);

  /** Só busca preview quando o modal está pronto, há base64 no servidor e não há videoUrl. */
  const previewSorteioId =
    drawResultModal?.phase === 'ready' &&
    drawResultModal.hasVideoPreview &&
    !drawResultModal.videoUrl?.trim()
      ? drawResultModal.sorteioId
      : null;

  useEffect(() => {
    if (!previewSorteioId) {
      revokePreviewBlob();
      setPreviewMediaUrl(null);
      setPreviewIsImage(false);
      return;
    }
    let cancelled = false;
    setPreviewLoadError(null);

    (async () => {
      try {
        const r = await api.get<{ mime: string; base64: string }>(
          `/consorcio/draws/${previewSorteioId}/video-preview`,
          { timeout: 120_000 }
        );
        if (cancelled) return;
        const b64 = r.data?.base64;
        if (!b64?.length) {
          setPreviewLoadError('Preview vazio no servidor.');
          return;
        }
        const mimeFromApi = r.data?.mime?.trim() || '';
        const sniffed = inferMediaMimeFromBase64Client(b64);
        const mime = sniffed || mimeFromApi || 'application/octet-stream';
        let blob: Blob;
        try {
          blob = base64ToBlob(b64, mime);
        } catch {
          setPreviewLoadError('Base64 inválido ou corrompido. Gere o GIF de novo no n8n.');
          return;
        }
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        revokePreviewBlob();
        previewBlobRef.current = url;
        setPreviewMediaUrl(url);
        setPreviewIsImage(mime.startsWith('image/'));
        setPreviewMediaFailed(false);
      } catch (e) {
        if (!cancelled) {
          setPreviewLoadError(
            (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
              'Não foi possível carregar o preview. Verifique a API e o tamanho do arquivo.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      revokePreviewBlob();
      setPreviewMediaUrl(null);
      setPreviewIsImage(false);
    };
  }, [previewSorteioId]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/consorcio/participants/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consorcio'] }),
  });

  const resetMutation = useMutation({
    mutationFn: () => api.post('/consorcio/reset'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consorcio'] }),
  });

  const onSaveSettings = () => {
    const dd = parseInt(drawDay, 10);
    const rd = parseInt(reminderDay, 10);
    if (Number.isNaN(dd) || dd < 1 || dd > 31) return;
    if (Number.isNaN(rd) || rd < 1 || rd > 31) return;
    patchSettingsMutation.mutate({
      drawDayOfMonth: dd,
      reminderDayOfMonth: rd,
      reminderTime,
      selectedPdfIds: [],
    });
  };

  const onDrawDayChange = (v: string) => {
    setSettingsDirty(true);
    setDrawDay(v);
  };
  const onReminderDayChange = (v: string) => {
    setSettingsDirty(true);
    setReminderDay(v);
  };
  const onReminderTimeChange = (v: string) => {
    setSettingsDirty(true);
    setReminderTime(v);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-app-bg text-ink-primary">
      {/* Top bar — glass */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-app-surface/80 px-6 backdrop-blur-xl lg:px-8">
        <div className="flex min-w-0 items-center gap-2 text-lg font-semibold tracking-tight">
          <Handshake className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="truncate text-primary">Consórcio</span>
          <span className="text-ink-muted">/</span>
          <span className="truncate text-xs font-medium text-ink-secondary">
            {cycleName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full p-2 text-ink-muted transition-all hover:bg-primary-light active:scale-95"
            aria-label="Notificações"
          >
            <Bell className="size-5" />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-ink-muted transition-all hover:bg-primary-light active:scale-95"
            aria-label="Conta"
          >
            <UserCircle2 className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 overflow-y-auto p-4 pb-4 sm:space-y-8 sm:p-6 lg:p-8 lg:pb-8">
        <AddParticipantModal open={addModalOpen} onOpenChange={setAddModalOpen} />

        {drawResultModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="draw-result-modal-title"
            aria-busy={drawResultModal.phase === 'loading'}
          >
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border/60 bg-app-surface p-6 shadow-xl">
              {drawResultModal.phase === 'loading' && (
                <>
                  <h2
                    id="draw-result-modal-title"
                    className="text-lg font-bold tracking-tight text-ink-primary"
                  >
                    Preparando o sorteio
                  </h2>
                  <p className="mt-2 text-sm text-ink-secondary">
                    Chamando o n8n para sortear e gerar o vídeo. Isso pode levar um minuto ou mais —
                    aguarde nesta tela.
                  </p>
                  <div className="mt-10 flex flex-col items-center justify-center gap-4 py-6">
                    <Loader2
                      className="size-12 animate-spin text-primary"
                      aria-hidden
                    />
                    <p className="text-center text-sm font-medium text-ink-secondary">
                      Gerando vídeo…
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-ink-secondary"
                      onClick={() => {
                        drawModalDismissedDuringLoadRef.current = true;
                        closeDrawResultModal();
                      }}
                    >
                      Fechar em segundo plano
                    </Button>
                  </div>
                </>
              )}

              {drawResultModal.phase === 'error' && (
                <>
                  <h2
                    id="draw-result-modal-title"
                    className="text-lg font-bold tracking-tight text-danger"
                  >
                    Não foi possível concluir
                  </h2>
                  <p className="mt-3 text-sm text-ink-primary">{drawResultModal.message}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        drawModalDismissedDuringLoadRef.current = false;
                        drawMutation.mutate();
                      }}
                      disabled={drawMutation.isPending}
                    >
                      Tentar novamente
                    </Button>
                    <Button type="button" variant="outline" onClick={closeDrawResultModal}>
                      Fechar
                    </Button>
                  </div>
                </>
              )}

              {drawResultModal.phase === 'ready' && (
                <>
                  <h2
                    id="draw-result-modal-title"
                    className="text-lg font-bold tracking-tight text-ink-primary"
                  >
                    Sorteio concluído
                  </h2>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Ganhadora:{' '}
                    <span className="font-semibold text-ink-primary">
                      {drawResultModal.winnerName}
                    </span>
                  </p>

                  <div className="mt-4">
                    {previewMediaFailed && previewLoadError ? (
                      <div
                        role="alert"
                        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-ink-primary"
                      >
                        {previewLoadError}
                      </div>
                    ) : (
                      (() => {
                        const vu = drawResultModal.videoUrl?.trim() ?? '';
                        if (vu) {
                          const displaySrc = vu.startsWith('data:')
                            ? resolvedVideoBlobUrl
                            : vu;
                          const dataPending =
                            vu.startsWith('data:') &&
                            !resolvedVideoBlobUrl &&
                            !previewMediaFailed;
                          if (dataPending) {
                            return (
                              <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-app-bg py-12">
                                <Loader2
                                  className="size-10 animate-spin text-primary"
                                  aria-hidden
                                />
                                <p className="text-sm text-ink-muted">
                                  Preparando pré-visualização…
                                </p>
                              </div>
                            );
                          }
                          if (displaySrc) {
                            return (
                              <DrawMediaPreview
                                src={displaySrc}
                                variant={
                                  vu.startsWith('data:')
                                    ? resolvedVideoIsImage
                                      ? 'image'
                                      : 'video'
                                    : isProbablyImageMediaSrc(vu)
                                      ? 'image'
                                      : 'video'
                                }
                                onImageError={() => {
                                  setPreviewMediaFailed(true);
                                  setPreviewLoadError(
                                    'Não foi possível exibir esta imagem/GIF. No n8n, envie o arquivo em gif_base64 ou videoBase64 (evite data URL enorme em videoUrl).'
                                  );
                                }}
                                onVideoError={() => {
                                  setPreviewMediaFailed(true);
                                  setPreviewLoadError(
                                    'Não foi possível reproduzir como vídeo. GIF deve ser enviado como imagem (gif_base64), não como MP4.'
                                  );
                                }}
                              />
                            );
                          }
                          return null;
                        }
                        if (previewMediaUrl) {
                          return (
                            <DrawMediaPreview
                              src={previewMediaUrl}
                              variant={previewIsImage ? 'image' : 'video'}
                              onImageError={() => {
                                setPreviewMediaFailed(true);
                                setPreviewLoadError(
                                  'GIF/imagem inválida ou truncada no banco. Faça um novo sorteio ou verifique o n8n.'
                                );
                              }}
                              onVideoError={() => {
                                setPreviewMediaFailed(true);
                                setPreviewLoadError(
                                  'Vídeo não pôde ser reproduzido (codec ou arquivo corrompido).'
                                );
                              }}
                            />
                          );
                        }
                        if (drawResultModal.hasVideoPreview) {
                          return (
                            <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-app-bg py-12">
                              <Loader2
                                className="size-10 animate-spin text-primary"
                                aria-hidden
                              />
                              <p className="text-sm text-ink-muted">
                                {previewLoadError ??
                                  'Carregando pré-visualização do vídeo…'}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <p className="text-sm text-ink-muted">
                            Nenhum vídeo retornado pelo n8n. Configure o envio no servidor se
                            ainda quiser disparar o WhatsApp sem vídeo.
                          </p>
                        );
                      })()
                    )}
                  </div>

                  <div className="mt-5 rounded-xl border border-border/70 bg-app-bg/50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                      Revistas para enviar junto (opcional)
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Marque os PDFs cujo <strong>link público</strong> deve ir no mesmo webhook do vídeo (
                      <code className="rounded bg-app-surface px-1">revistasParaEnviar</code>).
                    </p>
                    <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                      {(pdfsQuery.data?.pdfs ?? []).map((pdf) => {
                        const checked = drawSendRevistaIds.includes(pdf.id);
                        const label = (pdf.fileName?.trim() || pdf.title).trim();
                        const hasLink = Boolean(pdf.publicUrl?.trim());
                        return (
                          <label
                            key={pdf.id}
                            className={cn(
                              'flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                              checked
                                ? 'border-primary/40 bg-primary/5 text-ink-primary'
                                : 'border-border/70 bg-app-surface text-ink-secondary'
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary/30"
                              checked={checked}
                              onChange={() => toggleDrawSendRevista(pdf.id)}
                            />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="line-clamp-2 font-medium">{label}</span>
                              {!hasLink && (
                                <span className="text-[10px] text-amber-700">
                                  Sem URL pública — o n8n receberá file vazio para este item.
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {(pdfsQuery.data?.pdfs?.length ?? 0) === 0 && !pdfsQuery.isLoading && (
                      <p className="mt-2 text-xs text-ink-muted">
                        Nenhuma revista cadastrada. Cadastre em <strong>Revistas</strong>.
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-6">
                    {drawResultModal.whatsappDispatchPending ? (
                      <Button
                        type="button"
                        className="gap-2 font-semibold"
                        disabled={sendWhatsappMutation.isPending}
                        onClick={() =>
                          sendWhatsappMutation.mutate({
                            drawId: drawResultModal.sorteioId,
                            revistaPdfIds: drawSendRevistaIds,
                          })
                        }
                      >
                        <Send className="size-4" />
                        {sendWhatsappMutation.isPending
                          ? 'Enviando…'
                          : 'Enviar vídeo e revistas no WhatsApp'}
                      </Button>
                    ) : (
                      <p className="text-xs text-ink-secondary">
                        Envio pelo WhatsApp não disponível (configure{' '}
                        <code className="rounded bg-app-bg px-1">
                          N8N_CONSORCIO_SEND_WEBHOOK_URL
                        </code>{' '}
                        ou inclua vídeo/URL na resposta do n8n).
                      </p>
                    )}
                    <Button type="button" variant="outline" onClick={closeDrawResultModal}>
                      Fechar
                    </Button>
                  </div>
                  {sendWhatsappMutation.isError && (
                    <p className="mt-3 text-sm text-danger">
                      {(sendWhatsappMutation.error as { response?: { data?: { error?: string } } })
                        ?.response?.data?.error ?? 'Falha ao enviar.'}
                    </p>
                  )}
                  {sendWhatsappMutation.isSuccess && (
                    <p className="mt-3 text-sm text-emerald-700">
                      Envio disparado com sucesso.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {isError && (
          <div
            className="rounded-xl border border-danger/30 bg-danger-light/30 px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {(error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
              'Não foi possível carregar o consórcio. Verifique se a API está no ar e rode a migration do banco.'}
          </div>
        )}

        {drawN8nWarning && (
          <div
            className="rounded-xl border border-warning/40 bg-warning-light/30 px-4 py-3 text-sm text-ink-primary"
            role="status"
          >
            {drawN8nWarning}
            <button
              type="button"
              className="ml-3 text-xs font-bold text-primary underline"
              onClick={() => setDrawN8nWarning(null)}
            >
              Fechar
            </button>
          </div>
        )}

        {/* Submenu dentro do Consórcio (réplica do layout de referência) */}
        <div className="border-b border-outline-variant/10 bg-surface px-4 sm:px-8">
          <div className="flex gap-8">
            <button
              type="button"
              className={cn(
                'py-4 text-sm font-medium transition-colors',
                consorcioSubmenu === 'consorcio'
                  ? 'border-b-2 border-primary font-bold text-primary'
                  : 'text-slate-500 hover:text-primary'
              )}
              onClick={() => setConsorcioSubmenu('consorcio')}
            >
              Consórcio
            </button>
            <button
              type="button"
              className={cn(
                'py-4 text-sm font-medium transition-colors',
                consorcioSubmenu === 'revistas'
                  ? 'border-b-2 border-primary font-bold text-primary'
                  : 'text-slate-500 hover:text-primary'
              )}
              onClick={() => setConsorcioSubmenu('revistas')}
            >
              Revistas
            </button>
          </div>
        </div>

        {consorcioSubmenu === 'consorcio' ? (
          <>
        {/* Título + ações */}
        <div className="flex flex-col justify-end gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
              Consórcio
            </h1>
            <p className="text-sm text-ink-secondary">
              Gestão de ciclos e sorteios
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/settings"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-app-surface px-4 text-sm font-semibold text-ink-primary transition-all hover:border-primary/30 hover:bg-primary-light/40"
            >
              Configurações
            </Link>
            <Button
              type="button"
              className="h-9 gap-2 bg-gradient-to-br from-primary to-primary-hover font-semibold text-white shadow-btn-primary hover:opacity-90"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="size-5" />
              Adicionar participante
            </Button>
          </div>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-app-surface p-6 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-light">
              <Users className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
                Total participantes
              </p>
              <p className="text-2xl font-extrabold tracking-tight text-ink-primary">
                {stats.total}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-app-surface p-6 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-success-light">
              <CheckCircle2 className="size-6 text-emerald-600" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
                Elegíveis
              </p>
              <p className="text-2xl font-extrabold tracking-tight text-ink-primary">
                {stats.elegiveis}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-app-surface p-6 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-muted">
              <Gift className="size-6 text-primary-hover" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
                Já sorteadas
              </p>
              <p className="text-2xl font-extrabold tracking-tight text-ink-primary">
                {stats.sorteadas}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-app-surface p-6 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-warning-light">
              <Clock className="size-6 text-warning" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
                Próximo sorteio
              </p>
              <p className="text-sm font-extrabold tracking-tight text-ink-primary">
                {format(nextDrawDate, "d 'de' MMM yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Configurações do ciclo */}
        <section className="rounded-xl border border-border/60 bg-app-surface p-8 shadow-sm">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-ink-primary">
            <Settings2 className="size-4 text-primary" />
            Configurações do ciclo
          </h2>
          <div className="flex flex-wrap items-end gap-8">
            <div className="min-w-[200px] flex-1 space-y-2">
              <label className="ml-1 text-[11px] font-bold uppercase text-ink-secondary">
                Dia do sorteio
              </label>
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink-primary">
                <span>Todo dia</span>
                <input
                  className="h-9 w-12 rounded-lg border-0 bg-app-bg text-center text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20"
                  value={drawDay}
                  onChange={(e) => onDrawDayChange(e.target.value)}
                  inputMode="numeric"
                  maxLength={2}
                  aria-label="Dia do mês do sorteio"
                />
                <span>do mês</span>
              </div>
            </div>
            <div className="min-w-[200px] flex-1 space-y-2">
              <label className="ml-1 text-[11px] font-bold uppercase text-ink-secondary">
                Lembrete de pagamento
              </label>
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink-primary">
                <span>Todo dia</span>
                <input
                  className="h-9 w-12 rounded-lg border-0 bg-app-bg text-center text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20"
                  value={reminderDay}
                  onChange={(e) => onReminderDayChange(e.target.value)}
                  inputMode="numeric"
                  maxLength={2}
                  aria-label="Dia do lembrete"
                />
                <span>do mês</span>
              </div>
            </div>
            <div className="w-full space-y-2 sm:w-32">
              <label className="ml-1 text-[11px] font-bold uppercase text-ink-secondary">
                Horário
              </label>
              <input
                type="time"
                className="h-9 w-full rounded-lg border-0 bg-app-bg text-center text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20"
                value={reminderTime}
                onChange={(e) => onReminderTimeChange(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 font-semibold"
                onClick={onSaveSettings}
                disabled={patchSettingsMutation.isPending}
              >
                {patchSettingsMutation.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
              <Button
                type="button"
                className="h-9 gap-2 bg-gradient-to-br from-primary to-primary-hover font-semibold text-white shadow-btn-primary hover:opacity-90"
                onClick={() => drawMutation.mutate()}
                disabled={drawMutation.isPending || stats.elegiveis === 0}
              >
                <Sparkles className="size-[18px]" />
                {drawMutation.isPending ? 'Sorteando…' : 'Disparar sorteio agora'}
              </Button>
            </div>
            {drawMutation.isError && (
              <p className="w-full text-sm text-danger">
                {(drawMutation.error as { response?: { data?: { error?: string } } })?.response
                  ?.data?.error ?? 'Erro ao sortear.'}
              </p>
            )}
          </div>
        </section>

        {/* Participantes */}
        <section className="overflow-hidden rounded-xl border border-border/60 bg-app-surface shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border bg-app-surface p-6 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold tracking-tight text-ink-primary">
              Participantes do ciclo atual
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                placeholder="Buscar por nome..."
                className="h-10 w-full rounded-lg border-0 bg-app-bg py-2 pl-10 pr-4 text-sm placeholder:text-ink-muted focus:ring-2 focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-app-bg/80">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Nome
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Telefone
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Entrou em
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-ink-muted">
                      Carregando participantes…
                    </td>
                  </tr>
                )}
                {!isLoading && filteredParticipants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-ink-secondary">
                      Nenhuma participante neste ciclo. Use{' '}
                      <button
                        type="button"
                        className="font-semibold text-primary underline"
                        onClick={() => setAddModalOpen(true)}
                      >
                        Adicionar participante
                      </button>{' '}
                      ou cadastre clientes em{' '}
                      <Link href="/clients" className="font-semibold text-primary underline">
                        Clientes
                      </Link>
                      .
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  filteredParticipants.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-app-bg/60"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white',
                            avatarClassForInitial(p.name)
                          )}
                        >
                          {getInitials(p.name)}
                        </span>
                        <span className="text-sm font-bold text-ink-primary">
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={whatsappHref(p.phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        {formatPhoneBr(p.phone)}
                        <ExternalLink className="size-3.5" />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      {p.status === 'elegivel' ? (
                        <span className="rounded-full bg-success-light px-3 py-1 text-[11px] font-bold text-emerald-800">
                          Elegível
                        </span>
                      ) : (
                        <span className="rounded-full bg-app-bg px-3 py-1 text-[11px] font-bold text-ink-secondary ring-1 ring-border">
                          Sorteada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-secondary">
                      {format(new Date(p.joinedAt + 'T12:00:00'), 'd MMM yyyy', {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="rounded-full p-2 text-danger transition-colors hover:bg-danger-light/50 disabled:opacity-40"
                        aria-label={`Remover ${p.name}`}
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(p.id)}
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t border-border bg-app-surface p-4">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-ink-secondary transition-colors hover:bg-danger-light/20 hover:text-danger disabled:opacity-40"
              disabled={resetMutation.isPending || participants.length === 0}
              onClick={() => {
                if (
                  typeof window !== 'undefined' &&
                  !window.confirm(
                    'Isso remove todas as participantes e o histórico de sorteios deste ciclo. Continuar?'
                  )
                ) {
                  return;
                }
                resetMutation.mutate();
              }}
            >
              <RotateCcw className="size-4" />
              {resetMutation.isPending ? 'Resetando…' : 'Resetar ciclo'}
            </button>
          </div>
        </section>

        {/* Histórico */}
        <section className="overflow-hidden rounded-xl border border-border/60 bg-app-surface shadow-sm">
          <div className="border-b border-border p-6">
            <h2 className="text-base font-semibold tracking-tight text-ink-primary">
              Histórico de sorteios
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-app-bg/80">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Data
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Ganhadora
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Participantes
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Disparado por
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Automação (n8n)
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    WhatsApp
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Vídeo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-ink-muted">
                      Carregando histórico…
                    </td>
                  </tr>
                )}
                {!isLoading && draws.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-ink-secondary">
                      Nenhum sorteio registrado ainda.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  draws.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-app-bg/60"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-ink-primary">
                      {format(new Date(row.date + 'T12:00:00'), 'd MMM yyyy', {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                            avatarClassForInitial(row.winnerName)
                          )}
                        >
                          {getInitials(row.winnerName)}
                        </span>
                        <span className="text-sm font-medium text-ink-primary">
                          {row.winnerName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-secondary">
                      {row.participantCount}
                    </td>
                    <td className="px-6 py-4">
                      {row.triggeredBy === 'automatico' ? (
                        <span className="rounded-full bg-primary-muted px-3 py-1 text-[10px] font-bold uppercase text-primary-hover">
                          Automático
                        </span>
                      ) : (
                        <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase text-ink-secondary">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <DrawAutomationStatus row={row} />
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      {row.whatsappDispatchPending ? (
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-50"
                            disabled={sendWhatsappMutation.isPending}
                            onClick={() => {
                              drawModalDismissedDuringLoadRef.current = false;
                              setPreviewMediaFailed(false);
                              setDrawResultModal({
                                phase: 'ready',
                                sorteioId: row.id,
                                winnerName: row.winnerName,
                                videoUrl: row.videoUrl ?? null,
                                hasVideoPreview: row.hasVideoPreview,
                                whatsappDispatchPending: true,
                              });
                              clearPreviewMedia();
                              setPreviewLoadError(null);
                            }}
                          >
                            Revisar / enviar
                          </button>
                          <button
                            type="button"
                            className="text-[10px] font-bold text-primary underline"
                            disabled={sendWhatsappMutation.isPending}
                            onClick={() =>
                              sendWhatsappMutation.mutate({
                                drawId: row.id,
                                revistaPdfIds: [],
                              })
                            }
                          >
                            Enviar direto
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.videoUrl ? (
                        <a
                          href={row.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary-light"
                        >
                          <PlayCircle className="size-4" />
                          Ver vídeo
                        </a>
                      ) : (
                        <span className="text-xs text-ink-muted">Sem vídeo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
          </>
        ) : (
          <ConsorcioPdfsPanel participants={participants} />
        )}
      </main>
    </div>
  );
}
