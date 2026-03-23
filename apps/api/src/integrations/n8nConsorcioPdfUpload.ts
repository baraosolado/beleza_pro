/**
 * Webhook n8n: recebe PDF em base64, grava no MinIO (ou similar) e devolve URL pública.
 * Chamada HTTP alinhada ao consórcio: {@link postN8nJsonWebhook} (mesmo fetch/timeout/parse).
 */

import { postN8nFormDataWebhookNode, postN8nJsonWebhook } from './n8nConsorcioDraw.js';

export type ConsorcioPdfUploadN8nPayload = {
  evento: 'consorcio_revista_upload';
  usuarioId: string;
  titulo: string;
  categoria?: string;
  mesReferencia?: string;
  nomeArquivo: string | null;
  mime: string;
  /** Base64 puro (sem prefixo data:). */
  pdfBase64: string;
};

function pickString(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function unwrapN8nItem(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw) && raw.length > 0 && raw[0] != null && typeof raw[0] === 'object') {
    return raw[0] as Record<string, unknown>;
  }
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

const URL_FIELD_KEYS = [
  'publicUrl',
  'public_url',
  'pdfUrl',
  'pdf_url',
  'file',
  'url',
  'link',
  'minioUrl',
  'minio_url',
] as const;

/** Expressão n8n colada como texto fixo em "Respond to Webhook" (não foi avaliada). */
function looksLikeN8nExpressionLiteral(s: string): boolean {
  const t = s.trim();
  if (!t.startsWith('{{') || !t.includes('}}')) return false;
  return /\$(node|item|json|binary|parameter)\b/i.test(t);
}

/**
 * Aceita respostas comuns do n8n (Respond to Webhook / último nó).
 * Campos aceitos na raiz, em `json`, `body` ou `data`: publicUrl, pdfUrl, file, url…
 */
export function parseConsorcioPdfUploadResponse(raw: unknown): {
  publicUrl?: string;
  error?: string;
} {
  const top = unwrapN8nItem(raw);
  const inner = (top.json as Record<string, unknown>) ?? top;
  const bodyObj =
    inner.body != null && typeof inner.body === 'object' && !Array.isArray(inner.body)
      ? (inner.body as Record<string, unknown>)
      : null;
  const dataObj =
    inner.data != null && typeof inner.data === 'object' && !Array.isArray(inner.data)
      ? (inner.data as Record<string, unknown>)
      : null;

  const candidates = [inner, bodyObj, dataObj, top].filter(
    (o): o is Record<string, unknown> => o != null
  );

  for (const obj of candidates) {
    const publicUrl = pickString(obj, [...URL_FIELD_KEYS]);
    if (publicUrl) {
      if (looksLikeN8nExpressionLiteral(publicUrl)) {
        return {
          error:
            'O n8n devolveu a expressão como texto ({{ ... }}) em vez da URL real. No nó "Respond to Webhook", use o modo Expressão (ícone =) no campo pdfUrl/publicUrl, ou use "Respond With: JSON" preenchido com expressões avaliadas — não cole {{ $node... }} como string fixa.',
        };
      }
      try {
        new URL(publicUrl);
      } catch {
        return { error: 'URL pública inválida na resposta do n8n' };
      }
      return { publicUrl };
    }
  }

  const err =
    pickString(inner, ['error', 'message', 'detail']) ??
    (bodyObj ? pickString(bodyObj, ['error', 'message', 'detail']) : undefined) ??
    (typeof top.error === 'string' ? top.error : undefined);
  return { error: err ?? 'Resposta sem URL pública (esperado: pdfUrl, file ou publicUrl)' };
}

function webhookLogPrefix(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return '(URL inválida)';
  }
}

/** PDF grande + MinIO pode demorar mais que o webhook do sorteio. */
const PDF_UPLOAD_WEBHOOK_TIMEOUT_MS = 300_000;

export async function postConsorcioPdfUploadWebhook(
  url: string,
  body: ConsorcioPdfUploadN8nPayload
): Promise<
  | { ok: true; publicUrl: string }
  | { ok: false; error: string; httpStatus?: number }
> {
  const trimmed = url.trim();
  const hostPath = webhookLogPrefix(trimmed);
  if (trimmed.length < 12) {
    return { ok: false, error: 'URL do webhook inválida' };
  }

  console.log(
    `[consorcio-pdf-upload] Chamando webhook ${hostPath} | evento=${body.evento} usuarioId=${body.usuarioId} titulo=${JSON.stringify(body.titulo)} nomeArquivo=${JSON.stringify(body.nomeArquivo)} mime=${body.mime} pdfBase64Chars=${body.pdfBase64.length}` +
      (body.categoria ? ` categoria=${JSON.stringify(body.categoria)}` : '') +
      (body.mesReferencia ? ` mesReferencia=${JSON.stringify(body.mesReferencia)}` : '')
  );

  try {
    const { ok, status, text, raw } = await postN8nJsonWebhook(
      trimmed,
      body,
      'Webhook n8n (upload revista PDF)',
      PDF_UPLOAD_WEBHOOK_TIMEOUT_MS
    );

    if (!ok) {
      console.warn('[consorcio-pdf-upload] n8n HTTP', status, text.slice(0, 300));
      const parsed = parseConsorcioPdfUploadResponse(raw);
      const detail =
        parsed.error &&
        !parsed.error.startsWith('Resposta sem URL pública') &&
        parsed.error.length < 400
          ? parsed.error
          : undefined;
      return {
        ok: false,
        error:
          detail ??
          `n8n retornou ${status}${text ? `: ${text.slice(0, 200)}` : ''}`,
        httpStatus: status,
      };
    }

    const parsed = parseConsorcioPdfUploadResponse(raw);
    if (!parsed.publicUrl) {
      const snippet = text.replace(/\s+/g, ' ').slice(0, 240);
      console.warn(`[consorcio-pdf-upload] HTTP OK mas sem URL em ${hostPath}: ${parsed.error}`);
      return {
        ok: false,
        error:
          parsed.error && !parsed.error.startsWith('Resposta sem URL pública')
            ? `${parsed.error}${snippet ? ` | corpo: ${snippet}` : ''}`
            : snippet
              ? `Resposta sem pdfUrl/file. Corpo: ${snippet}`
              : (parsed.error ??
                'Webhook não retornou URL pública do PDF. No n8n, responda JSON: { "pdfUrl": "https://..." }'),
      };
    }

    console.log(`[consorcio-pdf-upload] OK ${hostPath} → URL recebida (${parsed.publicUrl.length} chars)`);
    return { ok: true, publicUrl: parsed.publicUrl };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `Timeout após ${PDF_UPLOAD_WEBHOOK_TIMEOUT_MS / 1000}s`
          : err.message
        : 'Erro ao chamar webhook';
    console.error('[consorcio-pdf-upload] Falha webhook upload revista:', msg);
    return { ok: false, error: msg };
  }
}

export type ConsorcioPdfUploadMultipartFields = {
  usuarioId: string;
  titulo: string;
  categoria?: string;
  mesReferencia?: string;
  nomeArquivo: string | null;
  mime: string;
  /** Buffer binário do PDF (não base64). */
  pdfBuffer: Buffer;
};

/**
 * Mesmo webhook que o JSON, porém com arquivo no campo **file** (multipart).
 * Campos de texto: evento, usuarioId, titulo, nomeArquivo, mime, categoria?, mesReferencia?
 */
export async function postConsorcioPdfUploadWebhookMultipart(
  url: string,
  fields: ConsorcioPdfUploadMultipartFields
): Promise<
  | { ok: true; publicUrl: string }
  | { ok: false; error: string; httpStatus?: number }
> {
  const trimmed = url.trim();
  const hostPath = webhookLogPrefix(trimmed);
  if (trimmed.length < 12) {
    return { ok: false, error: 'URL do webhook inválida' };
  }

  const fileName =
    fields.nomeArquivo?.trim() ||
    `revista-${fields.usuarioId.slice(0, 8)}.pdf`;

  console.log(
    `[consorcio-pdf-upload] Chamando webhook multipart ${hostPath} | evento=consorcio_revista_upload usuarioId=${fields.usuarioId} titulo=${JSON.stringify(fields.titulo)} nomeArquivo=${JSON.stringify(fileName)} mime=${fields.mime} pdfBytes=${fields.pdfBuffer.length}` +
      (fields.categoria ? ` categoria=${JSON.stringify(fields.categoria)}` : '') +
      (fields.mesReferencia ? ` mesReferencia=${JSON.stringify(fields.mesReferencia)}` : '')
  );

  try {
    const { ok, status, text, raw } = await postN8nFormDataWebhookNode(
      trimmed,
      (form) => {
        form.append('file', fields.pdfBuffer, {
          filename: fileName,
          contentType: fields.mime || 'application/pdf',
        });
        form.append('evento', 'consorcio_revista_upload');
        form.append('usuarioId', fields.usuarioId);
        form.append('titulo', fields.titulo);
        form.append(
          'nomeArquivo',
          fields.nomeArquivo?.trim() ? String(fields.nomeArquivo).trim() : ''
        );
        form.append('mime', fields.mime);
        if (fields.categoria?.trim()) form.append('categoria', fields.categoria.trim());
        if (fields.mesReferencia?.trim()) form.append('mesReferencia', fields.mesReferencia.trim());
      },
      'Webhook n8n (upload revista PDF multipart)',
      PDF_UPLOAD_WEBHOOK_TIMEOUT_MS
    );

    if (!ok) {
      console.warn('[consorcio-pdf-upload] n8n HTTP (multipart)', status, text.slice(0, 300));
      const parsed = parseConsorcioPdfUploadResponse(raw);
      const detail =
        parsed.error &&
        !parsed.error.startsWith('Resposta sem URL pública') &&
        parsed.error.length < 400
          ? parsed.error
          : undefined;
      return {
        ok: false,
        error:
          detail ??
          `n8n retornou ${status}${text ? `: ${text.slice(0, 200)}` : ''}`,
        httpStatus: status,
      };
    }

    const parsed = parseConsorcioPdfUploadResponse(raw);
    if (!parsed.publicUrl) {
      const snippet = text.replace(/\s+/g, ' ').slice(0, 240);
      console.warn(`[consorcio-pdf-upload] HTTP OK (multipart) mas sem URL em ${hostPath}: ${parsed.error}`);
      return {
        ok: false,
        error:
          parsed.error && !parsed.error.startsWith('Resposta sem URL pública')
            ? `${parsed.error}${snippet ? ` | corpo: ${snippet}` : ''}`
            : snippet
              ? `Resposta sem pdfUrl/file. Corpo: ${snippet}`
              : (parsed.error ??
                'Webhook não retornou URL pública do PDF. No n8n, responda JSON: { "pdfUrl": "https://..." }'),
      };
    }

    console.log(
      `[consorcio-pdf-upload] OK multipart ${hostPath} → URL recebida (${parsed.publicUrl.length} chars)`
    );
    return { ok: true, publicUrl: parsed.publicUrl };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `Timeout após ${PDF_UPLOAD_WEBHOOK_TIMEOUT_MS / 1000}s`
          : err.message
        : 'Erro ao chamar webhook';
    console.error('[consorcio-pdf-upload] Falha webhook multipart upload revista:', msg);
    return { ok: false, error: msg };
  }
}
