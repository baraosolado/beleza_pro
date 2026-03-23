'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, Info, Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Header } from '@/components/layout/Header';
import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewProductCategoryPage(): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      await api.post('/product-categories', {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      router.push('/products');
    },
  });

  const handleCancel = () => {
    router.push('/products');
  };

  return (
    <>
      <Header
        title="Produtos"
        subtitle="Organize seus produtos em categorias claras para facilitar o dia a dia"
      />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
          <div className="mb-8 flex w-full items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => router.push('/products')}
                className="font-medium hover:text-primary"
              >
                Produtos
              </button>
              <ChevronRight className="size-3" />
              <span className="hover:text-primary">Categorias</span>
              <ChevronRight className="size-3" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Nova Categoria
              </span>
            </div>
          </div>

          <section className="w-full max-w-[500px] space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Nova Categoria
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Defina as informações básicas para sua nova categoria de produtos.
            </p>
          </section>

          <Card className="mt-6 w-full max-w-[500px] overflow-hidden border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <form
              onSubmit={handleSubmit((data) => mutation.mutate(data))}
              className="divide-y divide-border/60 dark:divide-slate-800"
            >
              <div className="space-y-6 p-6">
                <div className="space-y-2">
                  <label
                    htmlFor="cat-name"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Nome da Categoria
                  </label>
                  <input
                    id="cat-name"
                    type="text"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Ex: Skincare, Acessórios"
                    {...register('name')}
                  />
                  {errors.name?.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="cat-desc"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Descrição
                    </label>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Opcional
                    </span>
                  </div>
                  <textarea
                    id="cat-desc"
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Descreva brevemente para que serve esta categoria..."
                    {...register('description')}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex items-center gap-1 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={handleCancel}
                >
                  <X className="size-4" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 text-sm font-bold shadow-lg shadow-primary/25 disabled:opacity-60"
                  disabled={mutation.isPending}
                >
                  <Save className="size-4" />
                  {mutation.isPending ? 'Criando...' : 'Criar Categoria'}
                </Button>
              </div>
            </form>
          </Card>

          <div className="mt-6 flex w-full max-w-[500px] items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/40">
            <Info className="mt-0.5 size-4 text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs leading-relaxed text-indigo-900 dark:text-indigo-100">
              <strong>Dica:</strong> categorias bem organizadas ajudam no gerenciamento de estoque
              e facilitam a busca para seus clientes no catálogo digital.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

