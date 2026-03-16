'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { clearTokens, getAccessToken, isAuthenticated, saveTokens } from '@/lib/auth';

export type User = {
  id: string;
  name: string;
  email: string;
  plan: string;
};

type LoginPayload = { email: string; password: string };
type RegisterPayload = { name: string; email: string; password: string };

export function useAuth(): {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  register: (payload: RegisterPayload) => Promise<void>;
} {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    api
      .get<{ name: string; email: string; plan: string }>('/settings')
      .then((res) => {
        setUser({
          id: '',
          name: res.data.name,
          email: res.data.email,
          plan: res.data.plan ?? 'trial',
        });
      })
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { data } = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; name: string; email: string; plan: string };
      }>('/auth/login', payload);
      saveTokens(data.accessToken, data.refreshToken);
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        plan: data.user.plan ?? 'trial',
      });
      router.push('/dashboard');
    },
    [router]
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { data } = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; name: string; email: string; plan: string };
      }>('/auth/register', payload);
      saveTokens(data.accessToken, data.refreshToken);
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        plan: data.user.plan ?? 'trial',
      });
      router.push('/dashboard');
    },
    [router]
  );

  return { user, isLoading, login, logout, register };
}
