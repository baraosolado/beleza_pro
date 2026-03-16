'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setToast(null);
    setIsLoading(true);
    try {
      await login(data);
      setToast({ type: 'success', message: 'Login realizado com sucesso.' });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erro ao fazer login'
          : 'Erro ao fazer login';
      setToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-violet-700 to-violet-900 p-10 lg:flex">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Beleza Pro
        </h1>
        <div>
          <h2 className="text-4xl font-bold leading-tight text-white">
            Seu negócio de beleza, organizado.
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            Gerencie clientes, agenda e cobranças em um só lugar. Lembretes
            automáticos pelo WhatsApp e Pix integrado.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/30 px-4 py-2 text-sm text-white">
              Agenda inteligente
            </span>
            <span className="rounded-full border border-white/30 px-4 py-2 text-sm text-white">
              Pix automático
            </span>
            <span className="rounded-full border border-white/30 px-4 py-2 text-sm text-white">
              WhatsApp integrado
            </span>
          </div>
        </div>
        <p className="text-sm text-white/50">
          © Beleza Pro · Todos os direitos reservados
        </p>
      </div>

      <div className="flex w-full flex-col justify-center bg-white p-8 lg:w-1/2">
        <div className="flex justify-end">
          <Link
            href="/auth/register"
            className="text-sm font-medium text-primary hover:underline"
          >
            Não tem conta? Crie grátis
          </Link>
        </div>
        <div className="mx-auto mt-8 w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Bem-vinda de volta
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Entre com seu e-mail e senha para acessar
          </p>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  className={cn(
                    'w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                    errors.email && 'border-red-500'
                  )}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={cn(
                    'w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-12 text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                    errors.password && 'border-red-500'
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300" />
                <span className="text-sm text-slate-600">Lembrar de mim</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
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
              className="h-12 w-full"
              isLoading={isLoading}
            >
              Entrar
            </Button>
          </form>
          <div className="mt-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-sm text-slate-500">ou</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-6 h-12 w-full"
            disabled
          >
            Continuar com Google
          </Button>
        </div>
      </div>
    </main>
  );
}
