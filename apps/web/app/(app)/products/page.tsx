'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Package, Plus, Search, Tag } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

type ProductCategory = 'all' | string;

type ProductItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stockQuantity: number;
};
type ProductCategoryItem = {
  id: string;
  name: string;
};

export default function ProductsPage(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () =>
      api
        .get<{ items: ProductItem[] }>('/products', {
          params: { search: search.trim() || undefined },
        })
        .then((r) => r.data),
  });

  const products = data?.items ?? [];

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () =>
      api
        .get<{ items: ProductCategoryItem[] }>('/product-categories')
        .then((r) => r.data),
  });

  const dynamicCategories: { key: ProductCategory; label: string }[] = [
    { key: 'all', label: 'Todos os Produtos' },
    ...(categoriesData?.items ?? []).map((c) => ({
      key: c.name,
      label: c.name,
    })),
  ];

  const filtered = products.filter((p) => {
    const normalizedCategory = (p.category || '').toLowerCase();
    const matchesCategory =
      category === 'all' ||
      (category && normalizedCategory === String(category).toLowerCase());
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description ? p.description.toLowerCase().includes(q) : false);
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Header
        title="Produtos"
        subtitle="Gerencie seu estoque e venda de produtos físicos"
        className="border-b border-border bg-white"
      />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8 dark:bg-slate-950/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          {/* Header interno */}
          <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Produtos
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Centralize o controle de estoque, categorias e vendas de produtos do seu studio.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-lg border border-border bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Buscar produtos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Link href="/products/new">
                <Button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 font-bold md:w-auto"
                >
                  <Plus className="size-4" />
                  Novo Produto
                </Button>
              </Link>
            </div>
          </section>

          {/* Tabs de categorias */}
          <section className="border-b border-border pb-2 dark:border-slate-800">
            <div className="flex flex-wrap gap-4">
              {dynamicCategories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={cn(
                    'pb-2 text-sm font-medium transition-colors border-b-2',
                    category === cat.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-primary dark:text-slate-400'
                  )}
                >
                  {cat.label}
                </button>
              ))}
              <Link href="/products/categories/new" className="ml-auto">
                <button
                  type="button"
                  className="flex items-center gap-1 pb-2 text-sm font-bold text-primary"
                >
                  <Plus className="size-4" />
                  Nova Categoria
                </button>
              </Link>
            </div>
          </section>

          {/* Grid de produtos */}
          <section>
            {isLoading ? (
              <Card className="flex items-center justify-between gap-4 border-border bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-64 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="h-9 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="flex items-center justify-between gap-4 border-dashed border-border bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    Nenhum produto encontrado.
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Cadastre seus primeiros produtos para controlar estoque e vendas.
                  </p>
                </div>
                <Link href="/products/new">
                  <Button type="button" className="gap-2">
                    <Plus className="size-4" />
                    Cadastrar Produto
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((product) => {
                  const isLowStock = product.stockQuantity <= 5;
                  return (
                    <Card
                      key={product.id}
                      className="flex h-full flex-col overflow-hidden border border-border bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start gap-3 border-b border-border/60 px-4 py-3 dark:border-slate-800">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
                            {product.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {product.category === 'cabelo'
                              ? 'Cabelo'
                              : product.category === 'unhas'
                                ? 'Unhas'
                                : product.category === 'estetica'
                                  ? 'Estética'
                                  : product.category === 'maquiagem'
                                    ? 'Maquiagem'
                                    : 'Geral'}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                          <Tag className="size-3" />
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-medium">Estoque</span>
                          <span
                            className={cn(
                              'font-semibold',
                              isLowStock
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {product.stockQuantity} unidade
                            {product.stockQuantity === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/60 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                        <Link href={`/products/${product.id}/edit`}>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 w-full border-border text-xs font-semibold dark:border-slate-700"
                          >
                            Editar
                          </Button>
                        </Link>
                        <Link
                          href={`/charges?amount=${product.price}&description=${encodeURIComponent(
                            product.name
                          )}&productId=${product.id}`}
                        >
                          <Button
                            type="button"
                            className="h-9 w-full bg-primary/10 text-xs font-bold text-primary hover:bg-primary hover:text-white"
                          >
                            Registrar Venda
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

