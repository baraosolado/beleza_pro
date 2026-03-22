'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { getAccessToken } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const token = typeof window !== 'undefined' ? getAccessToken() : null;

  useEffect(() => {
    if (!isLoading && token === null && typeof window !== 'undefined') {
      router.replace('/auth/login');
    }
  }, [isLoading, token, router]);

  if (!isLoading && token === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <p className="text-sm text-ink-secondary">Carregando...</p>
      </div>
    );
  }

  const planLabel =
    user?.plan === 'pro' ? 'Pro' : user?.plan === 'trial' ? 'Trial' : 'Basic';

  return (
    <AppShell
      userName={user?.name ?? ''}
      userPlan={planLabel}
      onLogout={() => {
        logout();
        router.replace('/auth/login');
      }}
    >
      {children}
    </AppShell>
  );
}
