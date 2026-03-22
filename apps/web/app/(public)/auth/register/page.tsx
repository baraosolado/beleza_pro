'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

const schema = z
  .object({
    name: z.string().min(1, 'Nome obrigatório'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
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
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setToast({ type: 'success', message: 'Conta criada com sucesso.' });
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erro ao criar conta'
          : 'Erro ao criar conta';
      setToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#BE185D] via-primary to-[#9D174D] p-10 lg:flex">
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

      <div className="flex w-full flex-col justify-center bg-app-bg p-8 lg:w-1/2">
        <div className="flex justify-end">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Já tem conta? Entrar
          </Link>
        </div>
        <div className="mx-auto mt-8 w-full max-w-sm">
          <div className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            ✨ 14 dias grátis, sem cartão
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-primary">
            Criar conta
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Preencha os dados para começar
          </p>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 space-y-4"
          >
            <Input
              label="Nome completo"
              type="text"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Senha"
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
              className="h-12 w-full"
              isLoading={isLoading}
            >
              Criar conta
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
