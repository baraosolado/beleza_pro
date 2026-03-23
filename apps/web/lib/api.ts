import axios, { type AxiosInstance } from 'axios';

import { clearTokens, getAccessToken } from './auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

type ApiErrorShape = { error?: string; code?: string };

/**
 * POST multipart sem forçar `Content-Type: application/json` do axios.
 * Útil para PDFs grandes (evita base64 no JSON).
 */
export async function postMultipart<T>(
  path: string,
  formData: FormData,
  options?: { timeoutMs?: number }
): Promise<T> {
  const token = getAccessToken();
  const url = `${baseURL}${path.startsWith('/') ? path : `/${path}`}`;
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 320_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      signal: controller.signal,
    });
    let data: unknown = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (res.status === 401) {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    if (!res.ok) {
      const err = new Error(
        (data as ApiErrorShape).error ?? `HTTP ${res.status}`
      ) as Error & { response?: { data: unknown; status: number } };
      err.response = { data, status: res.status };
      throw err;
    }
    return data as T;
  } finally {
    clearTimeout(t);
  }
}
