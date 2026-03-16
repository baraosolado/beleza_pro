'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { api } from '@/lib/api';
import { Button, Input } from '@/components/ui';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [toast, setToast] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      await api.post('/auth/forgot-password', { email: data.email });
      setToast({
        type: 'success',
        message: 'Se o e-mail existir, você receberá o link para redefinir a senha.',
      });
    } catch {
      setToast({
        type: 'success',
        message: 'Se o e-mail existir, você receberá o link para redefinir a senha.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-light p-8">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          Esqueci a senha
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Informe seu e-mail para receber o link de redefinição
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
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
            Enviar link
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
