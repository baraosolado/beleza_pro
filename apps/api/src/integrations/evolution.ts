import { createHash } from 'node:crypto';

import { env } from '../config/env.js';
import type { SendMediaParams, SendTextParams, WhatsAppProvider } from './whatsapp/types.js';

const BASE_URL = env.EVOLUTION_API_URL?.replace(/\/$/, '') ?? '';
const API_KEY = env.EVOLUTION_API_KEY ?? '';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: API_KEY,
  };
}

function headersWithToken(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: token,
  };
}

function instanceToken(instanceId: string): string {
  return createHash('sha256').update(`evolution:${instanceId}`).digest('hex');
}

function resolveWebhookUrl(): string | null {
  if (env.EVOLUTION_N8N_WEBHOOK_URL?.trim()) return env.EVOLUTION_N8N_WEBHOOK_URL.trim();
  if (env.EVOLUTION_WEBHOOK_URL?.trim()) return env.EVOLUTION_WEBHOOK_URL.trim();
  if (env.NEXT_PUBLIC_API_URL?.trim()) {
    return `${env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/webhooks/evolution`;
  }
  return null;
}

function getConnectBody(): Record<string, unknown> {
  const webhookUrl = resolveWebhookUrl();
  return {
    subscribe: ['MESSAGE'],
    ...(webhookUrl ? { webhookUrl } : {}),
  };
}

function getAdvancedSettingsBody(): Record<string, unknown> {
  return {
    ignoreGroups: true,
  };
}

async function callJson(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  return callJsonWithHeaders(method, path, headers(), body);
}

async function callJsonWithHeaders(
  method: string,
  path: string,
  requestHeaders: Record<string, string>,
  body?: Record<string, unknown>
): Promise<unknown> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`evolution ${path}: ${response.status} ${text}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return {};
  return response.json();
}

async function tryJson(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<unknown | null> {
  try {
    return await callJson(method, path, body);
  } catch {
    return null;
  }
}

async function tryJsonWithHeaders(
  method: string,
  path: string,
  requestHeaders: Record<string, string>,
  body?: Record<string, unknown>
): Promise<unknown | null> {
  try {
    return await callJsonWithHeaders(method, path, requestHeaders, body);
  } catch {
    return null;
  }
}

function extractQrBase64(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const asRecord = payload as Record<string, unknown>;

  const directQr = asRecord.qrcode;
  if (typeof directQr === 'string' && directQr.length > 0) return directQr;

  const direct = asRecord.base64;
  if (typeof direct === 'string' && direct.length > 0) return direct;

  const code = asRecord.code;
  if (typeof code === 'string' && code.length > 0) return code;

  const qr = asRecord.qr;
  if (typeof qr === 'string' && qr.length > 0) return qr;

  const qrcode = asRecord.qrcode;
  if (qrcode && typeof qrcode === 'object') {
    const qrRecord = qrcode as Record<string, unknown>;
    if (typeof qrRecord.base64 === 'string' && qrRecord.base64.length > 0) return qrRecord.base64;
    if (typeof qrRecord.code === 'string' && qrRecord.code.length > 0) return qrRecord.code;
    if (typeof qrRecord.qrcode === 'string' && qrRecord.qrcode.length > 0) return qrRecord.qrcode;
    if (typeof qrRecord.qr === 'string' && qrRecord.qr.length > 0) return qrRecord.qr;
  }

  const instance = asRecord.instance;
  if (instance && typeof instance === 'object') {
    const instanceRecord = instance as Record<string, unknown>;
    if (typeof instanceRecord.qrcode === 'string' && instanceRecord.qrcode.length > 0) return instanceRecord.qrcode;
    if (typeof instanceRecord.qr === 'string' && instanceRecord.qr.length > 0) return instanceRecord.qr;
    if (typeof instanceRecord.base64 === 'string' && instanceRecord.base64.length > 0) return instanceRecord.base64;
  }

  return null;
}

export async function createInstance(params: { instanceId: string; name?: string }): Promise<unknown> {
  const name = params.name?.trim() || params.instanceId;
  return callJson('POST', '/instance/create', {
    instanceName: params.instanceId,
    instance_id: params.instanceId,
    instanceId: params.instanceId,
    name,
    token: instanceToken(params.instanceId),
  });
}

export async function connectInstance(params: { instanceId: string }): Promise<unknown> {
  try {
    return await callJsonWithHeaders('POST', '/instance/connect', headers(), getConnectBody());
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes(' 401 ')) throw error;
    return callJsonWithHeaders(
      'POST',
      '/instance/connect',
      headersWithToken(instanceToken(params.instanceId)),
      getConnectBody()
    );
  }
}

export async function configureInstance(params: { instanceId: string }): Promise<unknown> {
  const path = `/instance/${encodeURIComponent(params.instanceId)}/advanced-settings`;
  try {
    return await callJsonWithHeaders('PUT', path, headers(), getAdvancedSettingsBody());
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes(' 401 ')) throw error;
    return callJsonWithHeaders(
      'PUT',
      path,
      headersWithToken(instanceToken(params.instanceId)),
      getAdvancedSettingsBody()
    );
  }
}

export async function getConnectQr(instanceId: string): Promise<{ base64?: string } | unknown> {
  const globalHeaders = headers();
  const tokenHeaders = headersWithToken(instanceToken(instanceId));

  await tryJsonWithHeaders('POST', '/instance/connect', globalHeaders, getConnectBody());
  await tryJsonWithHeaders('POST', '/instance/connect', tokenHeaders, getConnectBody());

  const attempts: Array<{
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: Record<string, unknown>;
  }> = [
    { method: 'GET', path: '/instance/qr', headers: globalHeaders },
    { method: 'GET', path: '/instance/qr', headers: tokenHeaders },
    { method: 'GET', path: `/instance/qr?instanceId=${encodeURIComponent(instanceId)}`, headers: globalHeaders },
    { method: 'GET', path: `/instance/qr?instanceId=${encodeURIComponent(instanceId)}`, headers: tokenHeaders },
    { method: 'POST', path: '/instance/qr', headers: globalHeaders, body: { instanceId } },
    { method: 'POST', path: '/instance/qr', headers: tokenHeaders, body: { instanceId } },
    { method: 'POST', path: '/instance/connect', headers: globalHeaders, body: { instanceId } },
    { method: 'POST', path: '/instance/connect', headers: tokenHeaders, body: { instanceId } },
    { method: 'POST', path: '/instance/connect', headers: globalHeaders, body: { instanceName: instanceId } },
    { method: 'POST', path: '/instance/connect', headers: tokenHeaders, body: { instanceName: instanceId } },
    { method: 'POST', path: '/instance/connect', headers: globalHeaders, body: { instance_id: instanceId } },
    { method: 'POST', path: '/instance/connect', headers: tokenHeaders, body: { instance_id: instanceId } },
    { method: 'GET', path: '/instance/status', headers: globalHeaders },
    { method: 'GET', path: '/instance/status', headers: tokenHeaders },
  ];

  for (const attempt of attempts) {
    const response = await tryJsonWithHeaders(
      attempt.method,
      attempt.path,
      attempt.headers,
      attempt.body
    );
    if (!response) continue;
    const base64 = extractQrBase64(response);
    if (base64) return { base64 };
  }

  throw new Error('evolution qr: no supported endpoint returned QR code');
}

export async function sendText(params: SendTextParams): Promise<unknown> {
  const number = normalizePhone(params.phone);

  const direct = await tryJson('POST', '/send/text', {
    instanceId: params.instanceId,
    number,
    text: params.text,
    delay: 1000,
  });
  if (direct) return direct;

  return callJson('POST', '/message/sendText', {
    instanceName: params.instanceId,
    number,
    text: params.text,
  });
}

export async function sendMedia(params: SendMediaParams): Promise<unknown> {
  const number = normalizePhone(params.phone);

  const direct = await tryJson('POST', '/send/media', {
    instanceId: params.instanceId,
    number,
    url: params.mediaUrl,
    caption: params.caption,
    type: 'image',
    delay: 1000,
  });
  if (direct) return direct;

  return callJson('POST', '/message/sendMedia', {
    instanceName: params.instanceId,
    number,
    media: params.mediaUrl,
    mediatype: 'image',
    caption: params.caption,
  });
}

export function isConfigured(): boolean {
  return BASE_URL.length > 0 && API_KEY.length > 0;
}

export const evolutionProvider: WhatsAppProvider = {
  connectInstance,
  configureInstance,
  createInstance,
  getConnectQr,
  isConfigured,
  sendMedia,
  sendText,
};
