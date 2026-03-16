'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  phone: z.string().min(1, 'Telefone obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
  firstAppointment: z.boolean().optional(),
  firstServiceId: z.string().optional(),
  firstScheduledAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type ServiceItem = { id: string; name: string };

export default function NewClientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () =>
      api.get<ServiceItem[] | { items: ServiceItem[] }>('/services').then((r) => r.data),
  });
  const services = Array.isArray(servicesData) ? servicesData : [];

  const mutation = useMutation({
    mutationFn: (body: FormData) =>
      api.post('/clients', {
        name: body.name,
        phone: body.phone.startsWith('+') ? body.phone : `+55${body.phone.replace(/\D/g, '')}`,
        email: body.email || undefined,
        notes: body.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setToast({ type: 'success', message: 'Cliente cadastrado com sucesso.' });
      router.push('/clients');
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erro ao cadastrar'
          : 'Erro ao cadastrar';
      setToast({ type: 'error', message });
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { firstAppointment: false },
  });

  const firstAppointment = watch('firstAppointment');

  return (
    <>
      <Header title="Nova Cliente" subtitle="Cadastre uma nova cliente" />
      <main className="flex-1 overflow-auto p-8">
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/clients" className="hover:text-primary">
            Clientes
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">Nova Cliente</span>
        </nav>

        <div className="mx-auto max-w-xl">
          <Card>
            <form
              onSubmit={handleSubmit((data) => mutation.mutate(data))}
              className="space-y-8"
            >
              <div>
                <h3 className="mb-4 text-sm font-semibold text-slate-700">
                  Informações Pessoais
                </h3>
                <div className="space-y-4">
                  <Input
                    label="Nome Completo"
                    error={errors.name?.message}
                    {...register('name')}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Telefone
                    </label>
                    <div className="flex rounded-lg border border-slate-200 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                      <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                        +55
                      </span>
                      <input
                        className="w-full px-4 py-2.5 text-slate-800 focus:outline-none"
                        placeholder="11 99999-9999"
                        {...register('phone')}
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                  <Input
                    label="Email"
                    type="email"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-semibold text-slate-700">
                  Observações
                </h3>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Alergias, preferências de esmalte..."
                  {...register('notes')}
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('firstAppointment')} />
                  <span className="text-sm font-semibold text-slate-700">
                    Primeiro Agendamento
                  </span>
                </label>
                {firstAppointment && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1 block text-sm text-slate-600">
                        Serviço
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-800"
                        {...register('firstServiceId')}
                      >
                        <option value="">Selecione</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Data e horário"
                      type="datetime-local"
                      {...register('firstScheduledAt')}
                    />
                  </div>
                )}
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

              <div className="flex gap-3">
                <Link href="/clients">
                  <Button type="button" variant="ghost">
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" isLoading={mutation.isPending}>
                  Salvar Cliente
                </Button>
              </div>
            </form>
          </Card>

          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
            💡 Após salvar, você pode enviar uma mensagem de boas-vindas pelo
            WhatsApp.
          </div>
        </div>
      </main>
    </>
  );
}
