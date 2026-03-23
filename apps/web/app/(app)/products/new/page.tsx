'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ChevronRight, Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Header } from '@/components/layout/Header';
import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  category: z.string().optional(),
  description: z.string().optional(),
  price: z.string().min(1, 'Preço obrigatório'),
  costPrice: z.string().optional(),
  stockQuantity: z.string().optional(),
  lowStockThreshold: z.string().optional(),
  sku: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type ProductCategoryItem = {
  id: string;
  name: string;
};

export default function NewProductPage(): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [lowStockAlert, setLowStockAlert] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () =>
      api
        .get<{ items: ProductCategoryItem[] }>('/product-categories')
        .then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      price: '',
      costPrice: '',
      stockQuantity: '',
      lowStockThreshold: '',
      sku: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const parseMoney = (value: string | undefined): number | null => {
        if (!value) return null;
        const normalized = value.replace(/\./g, '').replace(',', '.').trim();
        const n = Number(normalized);
        return Number.isNaN(n) ? null : n;
      };

      const price = parseMoney(data.price);
      if (price === null || price <= 0) {
        throw new Error('Preço inválido');
      }

      const costPrice = parseMoney(data.costPrice);
      const stockQuantity = data.stockQuantity ? Number(data.stockQuantity) : 0;
      const lowStockThreshold = data.lowStockThreshold
        ? Number(data.lowStockThreshold)
        : null;

      await api.post('/products', {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        category: data.category?.trim() || undefined,
        price,
        costPrice: costPrice ?? undefined,
        stockQuantity,
        lowStockAlert,
        lowStockThreshold,
        sku: data.sku?.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/products');
    },
  });

  const handleCancel = () => {
    router.push('/products');
  };

  return (
    <>
      <Header title="Produtos" subtitle="Cadastre um novo item físico para venda" />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950/40">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          {/* Breadcrumb / título interno */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => router.push('/products')}
                className="font-medium hover:text-primary"
              >
                Produtos
              </button>
              <ChevronRight className="size-3" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Novo Produto
              </span>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Novo Produto
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cadastre um novo item físico para venda no seu studio.
            </p>
          </section>

          <Card className="mx-auto max-w-3xl overflow-hidden border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <form
              onSubmit={handleSubmit((data) => mutation.mutate(data))}
              className="divide-y divide-border/60 dark:divide-slate-800"
            >
              {/* Imagem do produto */}
              <div className="p-6 sm:p-8">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Imagem do Produto
                </h3>
                <button
                  type="button"
                  className="group flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-slate-50/60 p-8 text-center transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
                >
                  <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-105 dark:bg-slate-900">
                    <Camera className="size-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Clique para enviar ou arraste a foto do produto
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    PNG, JPG ou WEBP (máx. 5MB)
                  </p>
                </button>
              </div>

              {/* Informações básicas */}
              <div className="space-y-6 p-6 sm:p-8">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Informações Básicas
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Nome do Produto
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="Ex: Shampoo Pós-Química 500ml"
                      {...register('name')}
                    />
                    {errors.name?.message && (
                      <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Categoria
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      defaultValue=""
                      {...register('category')}
                    >
                      <option value="">Selecione uma categoria</option>
                      {(categoriesData?.items ?? []).map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Descrição
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="Detalhes técnicos, modo de uso ou benefícios..."
                      {...register('description')}
                    />
                  </div>
                </div>
              </div>

              {/* Preço e estoque */}
              <div className="space-y-6 p-6 sm:p-8">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Preço e Estoque
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Preço de Venda
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">
                        R$
                      </span>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="0,00"
                        {...register('price')}
                      />
                      {errors.price?.message && (
                        <p className="mt-1 text-sm text-red-500">{errors.price.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Preço de Custo{' '}
                      <span className="text-xs font-normal text-slate-400">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">
                        R$
                      </span>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="0,00"
                        {...register('costPrice')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Quantidade em Estoque
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="0"
                      {...register('stockQuantity')}
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-1">
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                        lowStockAlert
                          ? 'border-primary/40 bg-primary/5 text-primary'
                          : 'border-border bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      )}
                      onClick={() => setLowStockAlert((v) => !v)}
                    >
                      <input
                        type="checkbox"
                        checked={lowStockAlert}
                        onChange={(e) => setLowStockAlert(e.target.checked)}
                        className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span>Alerta de estoque baixo</span>
                    </button>
                  </div>
                  {lowStockAlert && (
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Notificar quando estoque atingir
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="Ex: 5 unidades"
                        {...register('lowStockThreshold')}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Código / SKU */}
              <div className="space-y-6 p-6 sm:p-8">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Código e SKU
                </h3>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Código de Barras / SKU
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Ex: PRD-778899"
                    {...register('sku')}
                  />
                </div>
              </div>

              {/* Ações do formulário */}
              <div className="flex items-center justify-end gap-3 bg-slate-50 px-6 py-4 dark:bg-slate-900/60 sm:px-8">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={handleCancel}
                >
                  <X className="size-4" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-60"
                  disabled={mutation.isPending}
                >
                  <Save className="size-4" />
                  {mutation.isPending ? 'Salvando...' : 'Salvar Produto'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </>
  );
}

