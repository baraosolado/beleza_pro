import { env } from '../config/env.js';
import type { SendMediaParams, SendTextParams, WhatsAppProvider } from './whatsapp/types.js';

const BASE_URL = env.UAZAPI_BASE_URL?.replace(/\/$/, '') ?? '';
const TOKEN = env.UAZAPI_TOKEN ?? '';

async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`uazapi ${path}: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function createInstance(params: { instanceId: string; name?: string }): Promise<unknown> {
  return request('POST', '/instance/create', { instance_id: params.instanceId });
}

export async function connectInstance(params: { instanceId: string }): Promise<unknown> {
  return request('GET', `/instance/connect?instance_id=${encodeURIComponent(params.instanceId)}`);
}

export async function configureInstance(_params: { instanceId: string }): Promise<unknown> {
  return {};
}

export async function getConnectQr(instanceId: string): Promise<{ base64: string } | unknown> {
  return request('GET', `/instance/connect?instance_id=${encodeURIComponent(instanceId)}`);
}

export async function sendText(params: SendTextParams): Promise<unknown> {
  return request('POST', '/message/sendText', {
    instance_id: params.instanceId,
    phone: params.phone.replace(/\D/g, ''),
    text: params.text,
  });
}

export async function sendMedia(params: SendMediaParams): Promise<unknown> {
  return request('POST', '/message/sendMedia', {
    instance_id: params.instanceId,
    phone: params.phone.replace(/\D/g, ''),
    media_url: params.mediaUrl,
    caption: params.caption,
  });
}

export function isConfigured(): boolean {
  return BASE_URL.length > 0 && TOKEN.length > 0;
}

export const uazapiProvider: WhatsAppProvider = {
  connectInstance,
  configureInstance,
  createInstance,
  getConnectQr,
  isConfigured,
  sendMedia,
  sendText,
};
