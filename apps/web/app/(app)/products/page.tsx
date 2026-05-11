'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Search, Send, Tag, Trash2 } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type ProductCategory = 'all' | string;

type ProductItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stockQuantity: number;
  imageUrl?: string | null;
};
type ProductCategoryItem = {
  id: string;
  name: string;
};
type ClientItem = {
  id: string;
  name: string;
  phone: string;
};

export default function ProductsPage(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory>('all');
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [sendError, setSendError] = useState<string | null>(null);
  const queryClient = useQueryClient();

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
  const { data: clientsData, isFetching: isSearchingClients } = useQuery({
    queryKey: ['clients', 'product-send', debouncedClientSearch],
    queryFn: () =>
      api
        .get<{ items: ClientItem[] } | ClientItem[]>('/clients', {
          params: {
            search: debouncedClientSearch,
            page: '1',
            limit: '8',
          },
        })
        .then((r) => r.data),
    enabled: sendModalOpen && debouncedClientSearch.length >= 2,
  });

  const dynamicCategories: { key: ProductCategory; label: string }[] = [
    { key: 'all', label: 'Todos os Produtos' },
    ...(categoriesData?.items ?? []).map((c) => ({
      key: c.name,
      label: c.name,
    })),
  ];
  const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.items ?? []);
  const normalizedClientSearch = clientSearch.trim().toLowerCase();
  const filteredClients = clients;
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const shouldShowClientResults =
    normalizedClientSearch.length >= 2 &&
    (!selectedClient || clientSearch.trim() !== selectedClient.name);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedClientSearch(clientSearch.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

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

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (params: {
      productId: string;
      phone: string;
      clientName?: string;
    }) => {
      await api.post(`/products/${params.productId}/send-whatsapp`, {
        phone: params.phone,
        clientName: params.clientName,
      });
    },
    onSuccess: () => {
      window.alert('Produto enviado para o WhatsApp com sucesso.');
      setSendModalOpen(false);
      setSelectedProduct(null);
      setSelectedClientId('');
      setClientSearch('');
      setSendError(null);
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erro ao enviar produto no WhatsApp'
          : 'Erro ao enviar produto no WhatsApp';
      setSendError(message);
    },
  });

  const openSendModal = (product: ProductItem) => {
    setSelectedProduct(product);
    setSelectedClientId('');
    setClientSearch('');
    setSendError(null);
    setSendModalOpen(true);
  };

  return (
    <>
      <Header
        title="Produtos"
        subtitle="Gerencie seu estoque e venda de produtos físicos"
        className="border-b border-border bg-white"
      />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950/40">
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
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={`Foto do produto ${product.name}`}
                          className="h-36 w-full object-cover"
                        />
                      ) : null}
                      <div className="flex items-start gap-3 border-b border-border/60 px-4 py-3 dark:border-slate-800">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
                            {product.name}
                          </h3>
                          {product.category ? (
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {product.category === 'cabelo'
                                ? 'Cabelo'
                                : product.category === 'unhas'
                                  ? 'Unhas'
                                  : product.category === 'estetica'
                                    ? 'Estética'
                                    : product.category === 'maquiagem'
                                      ? 'Maquiagem'
                                      : product.category}
                            </p>
                          ) : null}
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
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full border-border text-xs font-semibold dark:border-slate-700"
                          disabled={sendMutation.isPending}
                          onClick={() => openSendModal(product)}
                        >
                          <Send className="mr-1 size-4" />
                          Enviar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/40"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Excluir o produto "${product.name}"? Essa ação não pode ser desfeita.`
                            );
                            if (!confirmed) return;
                            deleteMutation.mutate(product.id);
                          }}
                          aria-label={`Excluir produto ${product.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
      {sendModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setSendModalOpen(false)}
            aria-label="Fechar modal de envio"
          />
          <div
            className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Enviar produto no WhatsApp
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Produto: <span className="font-semibold">{selectedProduct.name}</span>
            </p>

            <div className="mt-4 space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Buscar cliente
              </label>
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  if (selectedClientId) setSelectedClientId('');
                }}
                placeholder="Nome ou telefone"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              {!shouldShowClientResults ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedClient
                    ? `Cliente selecionado: ${selectedClient.name}`
                    : 'Digite pelo menos 2 caracteres para buscar um cliente.'}
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-2 dark:border-slate-700">
                  {isSearchingClients ? (
                    <p className="px-2 py-3 text-sm text-slate-500">Buscando clientes...</p>
                  ) : filteredClients.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-slate-500">
                      Nenhum cliente encontrado.
                    </p>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setClientSearch(client.name);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                          selectedClientId === client.id
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        <span className="font-medium">{client.name}</span>
                        <span className="text-xs text-slate-500">{client.phone}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {sendError && (
                <p className="text-sm text-red-500">{sendError}</p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSendModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!selectedClient || sendMutation.isPending}
                onClick={() => {
                  if (!selectedProduct || !selectedClient) return;
                  setSendError(null);
                  sendMutation.mutate({
                    productId: selectedProduct.id,
                    phone: selectedClient.phone,
                    clientName: selectedClient.name,
                  });
                }}
              >
                {sendMutation.isPending ? 'Enviando...' : 'Enviar para cliente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

