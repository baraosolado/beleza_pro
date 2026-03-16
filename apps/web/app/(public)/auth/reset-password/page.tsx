'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { api } from '@/lib/api';
import { Button, Input } from '@/components/ui';

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [toast, setToast] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setToast(null);
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setDone(true);
      setToast({ type: 'success', message: 'Senha redefinida com sucesso.' });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Token inválido ou expirado'
          : 'Erro ao redefinir senha';
      setToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background-light p-8">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Link inválido
          </h1>
          <p className="mt-2 text-slate-500">
            O link de redefinição de senha está incompleto ou expirado. Solicite
            um novo em &quot;Esqueci a senha&quot;.
          </p>
          <Link
            href="/auth/forgot-password"
            className="mt-6 inline-block font-medium text-primary hover:underline"
          >
            Solicitar novo link
          </Link>
          <p className="mt-4">
            <Link href="/auth/login" className="text-sm text-slate-500 hover:underline">
              Voltar ao login
            </Link>
          </p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background-light p-8">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Senha redefinida
          </h1>
          <p className="mt-2 text-slate-500">
            Sua senha foi alterada. Faça login com a nova senha.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block w-full rounded-lg bg-primary px-6 py-3 text-center font-semibold text-white hover:bg-primary/90"
          >
            Ir para o login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-light p-8">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          Nova senha
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Defina uma nova senha para acessar sua conta
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          {toast && (
            <p
              className={
                toast.type === 'error'
                  ? 'text-sm text-red-500'
                  : 'text-sm text-emerald-600'
              }
            >
              {toast.message}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Redefinir senha
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/auth/login" className="text-primary hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </main>
  );
}
