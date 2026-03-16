'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Skeleton,
} from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';

type ServiceItem = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  active: boolean;
};

const serviceSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  durationMin: z.coerce.number().min(1, 'Mínimo 1 minuto'),
  price: z.coerce.number().min(0, 'Preço inválido'),
  active: z.boolean().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const { data: list, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get<ServiceItem[] | { items: ServiceItem[] }>(
        '/services'
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d as { items: ServiceItem[] }).items ?? [];
    },
  });

  const services: ServiceItem[] = Array.isArray(list) ? list : [];
  const editingService = editingId
    ? services.find((s) => s.id === editingId)
    : null;

  const createMutation = useMutation({
    mutationFn: (body: ServiceFormData) =>
      api.post('/services', {
        name: body.name,
        durationMin: body.durationMin,
        price: body.price,
        active: body.active ?? true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setModalOpen(false);
      setToast({ type: 'success', message: 'Serviço criado.' });
    },
    onError: (err: unknown) => {
      setToast({
        type: 'error',
        message:
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { error?: string } } }).response
                ?.data?.error ?? 'Erro'
            : 'Erro',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: { id: string; body: ServiceFormData }) =>
      api.put(`/services/${id}`, {
        name: body.name,
        durationMin: body.durationMin,
        price: body.price,
        active: body.active ?? true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setEditingId(null);
      setModalOpen(false);
      setToast({ type: 'success', message: 'Serviço atualizado.' });
    },
    onError: (err: unknown) => {
      setToast({
        type: 'error',
        message:
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { error?: string } } }).response
                ?.data?.error ?? 'Erro'
            : 'Erro',
      });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as Resolver<ServiceFormData>,
    values: editingService
      ? {
          name: editingService.name,
          durationMin: editingService.durationMin,
          price: Number(editingService.price),
          active: editingService.active,
        }
      : undefined,
    defaultValues: { durationMin: 60, active: true },
  });

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', durationMin: 60, price: 0, active: true });
    setModalOpen(true);
  };

  const openEdit = (s: ServiceItem) => {
    setEditingId(s.id);
    reset({
      name: s.name,
      durationMin: s.durationMin,
      price: Number(s.price),
      active: s.active,
    });
    setModalOpen(true);
  };

  const onSubmit = (data: ServiceFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
      <Header
        title="Serviços"
        subtitle="Catálogo de serviços"
        actionLabel="Novo Serviço"
        onAction={openCreate}
      />
      <main className="flex-1 overflow-auto p-8">
        {toast && (
          <p
            className={
              toast.type === 'error'
                ? 'mb-4 text-sm text-red-500'
                : 'mb-4 text-sm text-emerald-600'
            }
          >
            {toast.message}
          </p>
        )}

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {services.map((s) => (
              <Card
                key={s.id}
                className={cn('relative p-6', !s.active && 'opacity-60')}
              >
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={s.active}
                      readOnly
                    />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
                  </label>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Mais opções"
                    onClick={() => openEdit(s)}
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
                <h3 className="pr-24 text-lg font-semibold text-slate-800">
                  {s.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                    {s.durationMin} min
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                    {formatCurrency(Number(s.price))}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  Usado em 0 atendimentos
                </p>
                <Button
                  variant="ghost"
                  type="button"
                  className="mt-3"
                  onClick={() => openEdit(s)}
                >
                  Editar
                </Button>
              </Card>
            ))}

            <button
              type="button"
              onClick={openCreate}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 p-6 transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <Plus className="size-10 text-primary/50" />
              <span className="font-medium text-slate-600">
                Adicionar serviço
              </span>
            </button>
          </div>
        )}

        <Modal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingId(null);
          }}
          title={editingId ? 'Editar serviço' : 'Novo serviço'}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <Input
              label="Nome"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Duração (minutos)"
              type="number"
              min={1}
              error={errors.durationMin?.message}
              {...register('durationMin')}
            />
            <Input
              label="Preço (R$)"
              type="number"
              step="0.01"
              min={0}
              error={errors.price?.message}
              {...register('price')}
            />
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('active')} />
              <span className="text-sm text-slate-600">Ativo</span>
            </label>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setModalOpen(false);
                  setEditingId(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                Salvar
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  );
}
