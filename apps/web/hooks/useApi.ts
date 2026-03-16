'use client';

import { useCallback } from 'react';

import { api } from '@/lib/api';

export function useApi() {
  const get = useCallback(<T>(url: string) => api.get<T>(url).then((r) => r.data), []);
  const post = useCallback(
    <T>(url: string, data: unknown) => api.post<T>(url, data).then((r) => r.data),
    []
  );
  const put = useCallback(
    <T>(url: string, data: unknown) => api.put<T>(url, data).then((r) => r.data),
    []
  );
  const patch = useCallback(
    <T>(url: string, data?: unknown) => api.patch<T>(url, data).then((r) => r.data),
    []
  );
  const del = useCallback(<T>(url: string) => api.delete<T>(url).then((r) => r.data), []);

  return { get, post, put, patch, delete: del };
}
