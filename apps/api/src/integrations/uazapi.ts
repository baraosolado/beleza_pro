import { env } from '../config/env.js';

const BASE_URL = env.UAZAPI_BASE_URL?.replace(/\/$/, '') ?? '';
const TOKEN = env.UAZAPI_TOKEN ?? '';

export type SendTextParams = {
  instanceId: string;
  phone: string;
  text: string;
};

export type SendMediaParams = {
  instanceId: string;
  phone: string;
  mediaUrl: string;
  caption?: string;
};

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

export async function createInstance(instanceId: string): Promise<unknown> {
  return request('POST', '/instance/create', { instance_id: instanceId });
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
