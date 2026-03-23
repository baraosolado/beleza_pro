/**
 * @fileoverview Integração n8n — consórcio (sorteio orquestrado pelo n8n)
 *
 * 1) **Solicitação** (`N8N_CONSORCIO_DRAW_WEBHOOK_URL`): o SaaS envia só as elegíveis;
 *    o n8n sorteia (p.ex. via sua API), gera o vídeo e responde com **nome completo**
 *    da ganhadora + `videoUrl` e/ou `videoBase64`.
 * 2) **Envio** (`N8N_CONSORCIO_SEND_WEBHOOK_URL`): após a usuária revisar o vídeo no SaaS,
 *    ela confirma e o backend chama este webhook com vídeo + dados para WhatsApp.
 */

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

import FormDataNode from 'form-data';

/** Campos que o SaaS persiste após respostas do n8n (JSON). */
export type ConsorcioN8nAutomationStored = {
  videoGenerated?: boolean;
  whatsappSent?: boolean;
  workflowSuccess?: boolean;
  detailMessage?: string;
  atualizadoEm: string;
};

/** Payload do 1º webhook — sem ganhadora; o n8n define e devolve o nome completo. */
export type ConsorcioDrawN8nSolicitacaoPayload = {
  evento: 'consorcio_sorteio_solicitacao';
  disparadoEm: string;
  disparadoPor: 'manual' | 'automatico';
  salao: {
    usuarioId: string;
    nomeUsuario: string;
    emailUsuario: string | null;
    nomeNegocio: string | null;
    telefoneNegocio: string | null;
  };
  ciclo: {
    nome: string;
    diaSorteioNoMes: number;
  };
  totais: {
    totalParticipantes: number;
    elegiveisAntesDoSorteio: number;
    jaSorteadasAntesDoSorteio: number;
  };
  /** Lista para o sorteio — `ganhadoraNome` na resposta deve coincidir com `nome` (nome completo). */
  participantesElegiveis: Array<{
    participanteId: string;
    clienteId: string;
    nome: string;
    telefone: string;
  }>;
  /** Opcional: todas as participantes do ciclo (contexto). */
  participantesTodas?: Array<{
    participanteId: string;
    clienteId: string;
    nome: string;
    telefone: string;
    status: 'elegivel' | 'sorteada';
    elegivel: boolean;
  }>;
  /** Opcional: PDFs selecionados para envio no fluxo do sorteio. */
  revistasSelecionadas?: Array<{
    pdfId: string;
    docName: string;
    file: string | null;
    text: string;
    mime: string;
    /** Só presente em revistas legadas salvas em base64 no banco. */
    pdfBase64?: string;
  }>;
  saas: {
    appUrl: string | null;
    apiPublicUrl: string | null;
  };
};

/** Payload do 2º webhook — enviar vídeo + mensagem (ex.: grupo WhatsApp). */
export type ConsorcioSendWhatsappPayload = {
  evento: 'consorcio_sorteio_enviar';
  disparadoEm: string;
  sorteioId: string;
  salao: {
    usuarioId: string;
    nomeUsuario: string;
    emailUsuario: string | null;
    nomeNegocio: string | null;
    telefoneNegocio: string | null;
  };
  ganhadora: {
    nome: string;
    telefone: string;
    participanteId: string;
    clienteId: string;
  };
  ciclo: {
    nome: string;
    diaSorteioNoMes: number;
  };
  video: {
    videoUrl: string | null;
    videoBase64: string | null;
    videoMimeType: string | null;
  };
  /**
   * Revistas escolhidas no modal “Sorteio concluído” — links públicos atuais (e base64 se legado).
   * Mesma forma de `revistasSelecionadas` do webhook de solicitação.
   */
  revistasParaEnviar?: Array<{
    pdfId: string;
    docName: string;
    file: string | null;
    text: string;
    mime: string;
    pdfBase64?: string;
  }>;
};

export type ConsorcioDrawSolicitacaoWebhookResult =
  | {
      ok: true;
      winnerNameRaw?: string;
      videoUrlApplied?: string;
      videoBase64?: string;
      videoMimeType?: string;
      n8nMessage?: string;
      automation?: ConsorcioN8nAutomationStored;
    }
  | { ok: false; error: string };

export type ConsorcioSendWhatsappWebhookResult =
  | { ok: true; n8nMessage?: string; automation?: ConsorcioN8nAutomationStored }
  | { ok: false; error: string };

const WEBHOOK_TIMEOUT_MS = 120_000;
const SEND_WEBHOOK_TIMEOUT_MS = 90_000;

function unwrapN8nJson(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first || typeof first !== 'object') return {};
  const o = first as Record<string, unknown>;
  const inner = o.json;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return o;
}

function readBoolField(o: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const k of keys) {
    if (!(k in o)) continue;
    const v = o[k];
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1' || v === 'true' || v === 'sim' || v === 'SIM') return true;
    if (v === 0 || v === '0' || v === 'false' || v === 'nao' || v === 'não') return false;
  }
  return undefined;
}

function readStringField(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (!(k in o)) continue;
    const v = o[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

/**
 * Infere image/* ou video/* pelos primeiros bytes decodificados do base64 (evita GIF com mime video/mp4).
 */
export function inferMediaMimeFromBase64(base64: string): string | undefined {
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

/** Aceita `data:video/mp4;base64,AAA` ou só o base64 puro. */
export function extractVideoBase64AndMime(raw: string): { base64: string; mime?: string } {
  const s = raw.trim();
  const dataUrl = /^data:([^;]+);base64,([\s\S]+)$/i.exec(s);
  if (dataUrl) {
    return { mime: dataUrl[1], base64: dataUrl[2].replace(/\s/g, '') };
  }
  return { base64: s.replace(/\s/g, '') };
}

export function parseConsorcioDrawSolicitacaoResponse(raw: unknown): {
  winnerName?: string;
  videoUrl?: string;
  videoBase64?: string;
  videoMimeType?: string;
  message?: string;
  success?: boolean;
  videoGenerated?: boolean;
  whatsappSent?: boolean;
} {
  const o = unwrapN8nJson(raw);
  const winnerName = readStringField(o, [
    'ganhadoraNome',
    'ganhadora_nome',
    'winnerName',
    'winner_name',
    'ganhadora',
    'nomeGanhadora',
    'nome_ganhadora',
  ]);
  const v =
    (o.videoUrl as string | undefined) ??
    (o.video_url as string | undefined) ??
    (o.urlVideo as string | undefined);
  const videoUrl = typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;

  let videoMimeType =
    readStringField(o, ['videoMimeType', 'video_mime_type', 'mimeType']) ?? undefined;
  const rawB64 =
    readStringField(o, [
      'videoBase64',
      'video_base64',
      'gifBase64',
      'gif_base64',
      'videoData',
      'video',
    ]) ?? undefined;
  let videoBase64: string | undefined;
  if (rawB64) {
    const { base64, mime } = extractVideoBase64AndMime(rawB64);
    videoBase64 = base64;
    if (mime && !videoMimeType) videoMimeType = mime;
    if (!videoMimeType) {
      const inferred = inferMediaMimeFromBase64(base64);
      if (inferred) videoMimeType = inferred;
    }
  }

  const message =
    (typeof o.message === 'string' && o.message) ||
    (typeof o.mensagem === 'string' && o.mensagem) ||
    undefined;
  const success = typeof o.success === 'boolean' ? o.success : undefined;
  let videoGenerated = readBoolField(o, [
    'videoGenerated',
    'video_gerado',
    'videoGerado',
    'video_ok',
    'videoOk',
  ]);
  const whatsappSent = readBoolField(o, [
    'whatsappSent',
    'whatsapp_enviado',
    'mensagemEnviada',
    'messageSent',
    'mensagem_enviada',
    'whatsappMensagemEnviada',
  ]);
  if (videoUrl && videoGenerated === undefined) {
    videoGenerated = true;
  }
  if (videoBase64 && videoGenerated === undefined) {
    videoGenerated = true;
  }
  return { winnerName, videoUrl, videoBase64, videoMimeType, message, success, videoGenerated, whatsappSent };
}

export function parseConsorcioSendWhatsappResponse(raw: unknown): {
  message?: string;
  success?: boolean;
  whatsappSent?: boolean;
} {
  const o = unwrapN8nJson(raw);
  const message =
    (typeof o.message === 'string' && o.message) ||
    (typeof o.mensagem === 'string' && o.mensagem) ||
    undefined;
  const success = typeof o.success === 'boolean' ? o.success : undefined;
  let whatsappSent = readBoolField(o, [
    'whatsappSent',
    'whatsapp_enviado',
    'mensagemEnviada',
    'messageSent',
    'mensagem_enviada',
  ]);
  if (success === true && whatsappSent === undefined) {
    whatsappSent = true;
  }
  return { message, success, whatsappSent };
}

/** Monta o JSON persistido no banco a partir do parse da resposta do n8n. */
export function buildN8nAutomationStored(parsed: {
  message?: string;
  videoGenerated?: boolean;
  whatsappSent?: boolean;
  success?: boolean;
}): ConsorcioN8nAutomationStored | null {
  const atualizadoEm = new Date().toISOString();
  const out: ConsorcioN8nAutomationStored = { atualizadoEm };

  if (parsed.videoGenerated !== undefined) out.videoGenerated = parsed.videoGenerated;
  if (parsed.whatsappSent !== undefined) out.whatsappSent = parsed.whatsappSent;
  if (parsed.message) out.detailMessage = parsed.message;
  if (parsed.success === true) out.workflowSuccess = true;
  if (parsed.success === false) out.workflowSuccess = false;

  const hasAnything =
    out.videoGenerated !== undefined ||
    out.whatsappSent !== undefined ||
    out.detailMessage !== undefined ||
    out.workflowSuccess !== undefined;

  if (!hasAnything) return null;
  return out;
}

/**
 * POST JSON para webhooks n8n — mesmo padrão usado no sorteio/envio do consórcio.
 * (timeout com AbortController, igual ao restante do SaaS.)
 */
export async function postN8nJsonWebhook(
  url: string,
  body: unknown,
  label: string,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; text: string; raw: unknown }> {
  const trimmed = url.trim();
  if (trimmed.length < 12) {
    return { ok: false, status: 0, text: 'URL inválida', raw: {} };
  }
  const urlDisplay = trimmed.replace(/https?:\/\/[^/]+/, (m) => `${m.slice(0, 24)}…`);
  console.log(`[consorcio] ${label}:`, urlDisplay);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(trimmed, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(t);
  const text = await res.text().catch(() => '');
  let raw: unknown = {};
  if (text) {
    try {
      raw = JSON.parse(text);
    } catch {
      raw = {};
    }
  }
  return { ok: res.ok, status: res.status, text, raw };
}

/**
 * POST multipart com `FormData` **nativo** (undici).
 * Para upload de arquivo grande ao n8n, prefira {@link postN8nFormDataWebhookNode}.
 */
export async function postN8nFormDataWebhook(
  url: string,
  formData: FormData,
  label: string,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; text: string; raw: unknown }> {
  const trimmed = url.trim();
  if (trimmed.length < 12) {
    return { ok: false, status: 0, text: 'URL inválida', raw: {} };
  }
  const urlDisplay = trimmed.replace(/https?:\/\/[^/]+/, (m) => `${m.slice(0, 24)}…`);
  console.log(`[consorcio] ${label} (multipart):`, urlDisplay);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(trimmed, {
    method: 'POST',
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(t);
  const text = await res.text().catch(() => '');
  let raw: unknown = {};
  if (text) {
    try {
      raw = JSON.parse(text);
    } catch {
      raw = {};
    }
  }
  return { ok: res.ok, status: res.status, text, raw };
}

type FormDataNodeInstance = InstanceType<typeof FormDataNode>;

/**
 * Envia multipart gerado pelo pacote `form-data` via **`form.pipe(req)`** (http/https nativo).
 * O `fetch` do Node com body = stream do `form-data` pode enviar corpo quase vazio (ex.: Content-Length ~17),
 * o que no n8n aparece como `body: {}` e sem binário.
 */
function postFormDataPipe(
  targetUrl: string,
  form: FormDataNodeInstance,
  signal: AbortSignal
): Promise<{ statusCode: number; text: string }> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
      return;
    }

    let settled = false;
    const u = new URL(targetUrl);
    const isHttps = u.protocol === 'https:';
    const mod = isHttps ? https : http;

    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port ? Number(u.port) : isHttps ? 443 : 80,
        path: `${u.pathname}${u.search}`,
        method: 'POST',
        headers: form.getHeaders(),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({
            statusCode: res.statusCode ?? 0,
            text: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      req.destroy();
      reject(err);
    };

    const cleanup = () => {
      signal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      fail(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
    };

    signal.addEventListener('abort', onAbort, { once: true });

    req.on('error', (err) => fail(err));
    form.on('error', (err) => fail(err));

    form.pipe(req);
  });
}

/**
 * Multipart com pacote **`form-data`** (stream + boundary clássicos).
 * Enviado com `http(s).request` + `form.pipe(req)` — compatível com n8n e proxies.
 */
export async function postN8nFormDataWebhookNode(
  url: string,
  build: (form: FormDataNodeInstance) => void,
  label: string,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; text: string; raw: unknown }> {
  const trimmed = url.trim();
  if (trimmed.length < 12) {
    return { ok: false, status: 0, text: 'URL inválida', raw: {} };
  }
  const urlDisplay = trimmed.replace(/https?:\/\/[^/]+/, (m) => `${m.slice(0, 24)}…`);
  console.log(`[consorcio] ${label} (multipart form-data npm + pipe):`, urlDisplay);

  const form = new FormDataNode();
  build(form);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { statusCode, text } = await postFormDataPipe(trimmed, form, controller.signal);
    clearTimeout(t);
    let raw: unknown = {};
    if (text) {
      try {
        raw = JSON.parse(text);
      } catch {
        raw = {};
      }
    }
    const ok = statusCode >= 200 && statusCode < 300;
    return { ok, status: statusCode, text, raw };
  } catch (err) {
    clearTimeout(t);
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[consorcio] ${label} multipart npm falhou:`, msg);
    return {
      ok: false,
      status: 0,
      text: msg,
      raw: {},
    };
  }
}

/**
 * 1º webhook: solicita sorteio + vídeo ao n8n.
 */
export async function postConsorcioDrawSolicitacaoWebhook(
  url: string,
  payload: ConsorcioDrawN8nSolicitacaoPayload
): Promise<ConsorcioDrawSolicitacaoWebhookResult> {
  const trimmed = url.trim();
  if (trimmed.length < 12) {
    return { ok: false, error: 'URL do webhook inválida' };
  }
  try {
    const { ok, status, text, raw } = await postN8nJsonWebhook(
      trimmed,
      payload,
      'Webhook n8n (solicitação sorteio)',
      WEBHOOK_TIMEOUT_MS
    );
    if (!ok) {
      console.warn('[consorcio] n8n solicitação HTTP', status, text.slice(0, 300));
      return {
        ok: false,
        error: `n8n retornou ${status}${text ? `: ${text.slice(0, 200)}` : ''}`,
      };
    }
    const parsed = parseConsorcioDrawSolicitacaoResponse(raw);
    if (parsed.videoUrl) {
      console.log('[consorcio] n8n retornou videoUrl');
    }
    if (parsed.videoBase64) {
      console.log('[consorcio] n8n retornou videoBase64 (tamanho)', parsed.videoBase64.length);
    }
    const automation = buildN8nAutomationStored({
      message: parsed.message,
      videoGenerated: parsed.videoGenerated,
      whatsappSent: parsed.whatsappSent,
      success: parsed.success,
    });
    if (automation) {
      console.log('[consorcio] n8n automation (solicitação):', {
        videoGenerated: automation.videoGenerated,
        whatsappSent: automation.whatsappSent,
      });
    }
    return {
      ok: true,
      winnerNameRaw: parsed.winnerName,
      videoUrlApplied: parsed.videoUrl,
      videoBase64: parsed.videoBase64,
      /** Sem default forçado: o service infere GIF/JPEG/MP4 pelo base64 quando faltar. */
      videoMimeType: parsed.videoMimeType,
      n8nMessage: parsed.message,
      ...(automation && { automation }),
    };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `Timeout após ${WEBHOOK_TIMEOUT_MS / 1000}s`
          : err.message
        : 'Erro ao chamar webhook';
    console.error('[consorcio] Falha webhook solicitação:', msg);
    return { ok: false, error: msg };
  }
}

/**
 * 2º webhook: enviar vídeo + dados ao WhatsApp (ou canal configurado no n8n).
 */
export async function postConsorcioSendWhatsappWebhook(
  url: string,
  payload: ConsorcioSendWhatsappPayload
): Promise<ConsorcioSendWhatsappWebhookResult> {
  const trimmed = url.trim();
  if (trimmed.length < 12) {
    return { ok: false, error: 'URL do webhook de envio inválida' };
  }
  try {
    const { ok, status, text, raw } = await postN8nJsonWebhook(
      trimmed,
      payload,
      'Webhook n8n (enviar WhatsApp)',
      SEND_WEBHOOK_TIMEOUT_MS
    );
    if (!ok) {
      console.warn('[consorcio] n8n envio HTTP', status, text.slice(0, 300));
      return {
        ok: false,
        error: `n8n retornou ${status}${text ? `: ${text.slice(0, 200)}` : ''}`,
      };
    }
    const parsed = parseConsorcioSendWhatsappResponse(raw);
    const automation = buildN8nAutomationStored({
      message: parsed.message,
      whatsappSent: parsed.whatsappSent ?? true,
      success: parsed.success ?? true,
    });
    return {
      ok: true,
      n8nMessage: parsed.message,
      ...(automation && { automation }),
    };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `Timeout após ${SEND_WEBHOOK_TIMEOUT_MS / 1000}s`
          : err.message
        : 'Erro ao chamar webhook de envio';
    console.error('[consorcio] Falha webhook envio:', msg);
    return { ok: false, error: msg };
  }
}

/** Webhook: enviar revista (PDF) para um cliente qualquer (menu Clientes). */
export type ConsorcioRevistaClienteN8nPayload = {
  evento: 'consorcio_revista_enviar_cliente';
  disparadoEm: string;
  usuarioId: string;
  salao: {
    nomeUsuario: string;
    emailUsuario: string | null;
    nomeNegocio: string | null;
    telefoneNegocio: string | null;
  };
  cliente: {
    clienteId: string;
    nome: string;
    telefone: string;
  };
  pdf: {
    pdfId: string;
    titulo: string;
    nomeArquivo: string | null;
    file: string | null;
    mime: string;
    pdfBase64?: string;
  };
  legenda: string;
};

const REVISTA_CLIENT_WEBHOOK_TIMEOUT_MS = 90_000;

export async function postConsorcioRevistaClienteWebhook(
  url: string,
  payload: ConsorcioRevistaClienteN8nPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = url.trim();
  if (trimmed.length < 12) {
    return { ok: false, error: 'URL do webhook inválida' };
  }
  try {
    const { ok, status, text } = await postN8nJsonWebhook(
      trimmed,
      payload,
      'Webhook n8n (revista → cliente)',
      REVISTA_CLIENT_WEBHOOK_TIMEOUT_MS
    );
    if (!ok) {
      return {
        ok: false,
        error: `n8n retornou ${status}${text ? `: ${text.slice(0, 200)}` : ''}`,
      };
    }
    return { ok: true };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `Timeout após ${REVISTA_CLIENT_WEBHOOK_TIMEOUT_MS / 1000}s`
          : err.message
        : 'Erro ao chamar webhook';
    console.error('[consorcio] Falha webhook revista→cliente:', msg);
    return { ok: false, error: msg };
  }
}
