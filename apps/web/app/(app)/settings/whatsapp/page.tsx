'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Lightbulb, MoreVertical, PlusCircle, QrCode, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type QrResponse = {
  qrcode?: string | null;
  connected?: boolean;
  phone?: string;
};

type SettingsResponse = {
  whatsappInstanceId?: string | null;
};

type SetupStep = {
  key: string;
  label: string;
  done: boolean;
};

function toQrImageSrc(qrcode: string | null | undefined): string | null {
  if (!qrcode) return null;
  if (qrcode.startsWith('data:image/')) return qrcode;
  return `data:image/png;base64,${qrcode}`;
}

export default function SettingsWhatsAppPage() {
  const queryClient = useQueryClient();
  const [instanceName, setInstanceName] = useState('');
  const [createdInstanceName, setCreatedInstanceName] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const { data: qrData, isLoading } = useQuery({
    queryKey: ['whatsapp', 'qrcode'],
    queryFn: () =>
      api.get<QrResponse>('/settings/whatsapp/qrcode').then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings', 'whatsapp'],
    queryFn: () => api.get<SettingsResponse>('/settings').then((r) => r.data),
  });

  const createInstanceMutation = useMutation({
    mutationFn: (payload: { instanceName: string }) => api.post('/settings/whatsapp/connect', payload),
    onSuccess: () => {
      setCreatedInstanceName(instanceName.trim());
      queryClient.invalidateQueries({ queryKey: ['whatsapp'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setToast({
        type: 'success',
        message: 'Instância criada com sucesso. Agora gere o QR Code no card.',
      });
    },
    onError: () => {
      setToast({ type: 'error', message: 'Erro ao criar instância. Verifique o nome informado.' });
    },
  });

  const refreshQrMutation = useMutation({
    mutationFn: () => queryClient.invalidateQueries({ queryKey: ['whatsapp', 'qrcode'] }),
  });

  const connected = qrData?.connected ?? false;
  const phone = qrData?.phone;
  const qrImageSrc = toQrImageSrc(qrData?.qrcode);
  const hasInstanceCard = Boolean(settingsData?.whatsappInstanceId || createdInstanceName || connected);
  const setupSteps: SetupStep[] = [
    { key: 'instance', label: 'Instância criada', done: hasInstanceCard },
    { key: 'configured', label: 'Configurações aplicadas', done: hasInstanceCard },
    { key: 'qr', label: 'QR code disponível', done: Boolean(qrImageSrc) },
    { key: 'connected', label: 'WhatsApp conectado', done: connected },
  ];

  return (
    <>
      <Header title="WhatsApp" />
      <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50/40 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          <nav className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/settings" className="hover:text-primary">
              Configurações
            </Link>
            <ChevronRight className="size-4" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              WhatsApp
            </span>
          </nav>

          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Conexão WhatsApp
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Gerencie a conectividade do seu studio com clientes. A integração permite envio
              automatizado de lembretes, confirmações e mensagens de relacionamento.
            </p>
          </div>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Gerenciamento de conexão
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Crie uma instância com um nome único para iniciar o pareamento no WhatsApp.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={instanceName}
                  onChange={(event) => setInstanceName(event.target.value)}
                  placeholder="Ex.: studio-miriam"
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <Button
                  type="button"
                  onClick={() => createInstanceMutation.mutate({ instanceName: instanceName.trim() })}
                  disabled={createInstanceMutation.isPending || instanceName.trim().length < 2}
                  isLoading={createInstanceMutation.isPending}
                  className="whitespace-nowrap rounded-xl px-6"
                >
                  <PlusCircle className="mr-2 size-4" />
                  Criar instância
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Capacidade
              </p>
              <h4 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                Instâncias ativas
              </h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {hasInstanceCard ? '1 de 3 disponíveis' : '0 de 3 disponíveis'}
              </p>
              <div className="mt-4 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn(
                    'h-2 rounded-full bg-gradient-to-r from-primary to-pink-400 transition-all',
                    hasInstanceCard ? 'w-1/3' : 'w-0'
                  )}
                />
              </div>
            </div>
          </section>

          {hasInstanceCard && (
            <section className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Instância ativa
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Monitore a conexão e gere QR code em tempo real.
                  </p>
                </div>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {hasInstanceCard ? '1 de 3 disponíveis' : '0 de 3 disponíveis'}
                </span>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2 overflow-hidden rounded-3xl border border-border/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 p-6 dark:border-slate-800">
                    <div className="flex items-start gap-4">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-pink-500 text-white shadow-lg shadow-primary/20">
                        <QrCode className="size-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {createdInstanceName ?? settingsData?.whatsappInstanceId ?? 'Instância principal'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {connected
                            ? `Número vinculado: ${phone ?? '—'}`
                            : 'Aguardando leitura do QR Code'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </div>
                  <div className="border-b border-border/60 px-6 py-4 dark:border-slate-800">
                    <div className="flex flex-wrap gap-2">
                      {setupSteps.map((step) => (
                        <span
                          key={step.key}
                          className={cn(
                            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                            step.done
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                              : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          )}
                        >
                          <span
                            className={cn(
                              'mr-2 size-1.5 rounded-full',
                              step.done ? 'bg-emerald-500' : 'bg-slate-400'
                            )}
                          />
                          {step.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-8">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center gap-6 py-12">
                        <div className="flex size-64 items-center justify-center rounded-3xl border-2 border-dashed border-border bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                          <RefreshCw className="size-12 animate-spin text-slate-400" />
                        </div>
                      </div>
                    ) : connected ? (
                      <div className="flex flex-col items-center gap-6 py-4">
                        <p className="text-slate-600 dark:text-slate-300">
                          Seu WhatsApp está vinculado e pronto para envio de lembretes e cobranças.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Desconectar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-center">
                        <div className="flex flex-col items-center">
                          <div className="relative group">
                            <div className="flex size-64 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-border bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                              {qrImageSrc ? (
                                <img
                                  src={qrImageSrc}
                                  alt="QR Code WhatsApp"
                                  className="size-full object-contain p-2"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                  <QrCode className="size-14" />
                                  <span className="text-xs font-medium uppercase tracking-wider">
                                    QR Code indisponível
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="mt-4 flex justify-center">
                              <button
                                type="button"
                                className="flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
                                onClick={() => refreshQrMutation.mutate()}
                                disabled={refreshQrMutation.isPending}
                              >
                                <RefreshCw
                                  className={cn('size-5', refreshQrMutation.isPending && 'animate-spin')}
                                />
                                {qrImageSrc ? 'Atualizar QR Code' : 'Gerar QR Code'}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="max-w-sm flex-1">
                          <h4 className="mb-6 font-bold text-slate-900 dark:text-slate-100">
                            Como conectar:
                          </h4>
                          <ul className="space-y-6">
                            <li className="flex gap-4">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                1
                              </span>
                              <p className="text-sm text-slate-600 dark:text-slate-300">
                                Abra o <strong>WhatsApp</strong> no seu celular
                              </p>
                            </li>
                            <li className="flex gap-4">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                2
                              </span>
                              <p className="text-sm text-slate-600 dark:text-slate-300">
                                Toque em <strong>Configurações</strong> &gt;{' '}
                                <strong>Aparelhos conectados</strong>
                              </p>
                            </li>
                            <li className="flex gap-4">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                3
                              </span>
                              <p className="text-sm text-slate-600 dark:text-slate-300">
                                Aponte a câmera para esta tela para <strong>escanear o código</strong>
                              </p>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-3xl border border-border/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Pareamento em tempo real
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    Ao gerar o QR code, escaneie pelo recurso "Aparelhos conectados" do WhatsApp.
                    Isso mantém a estabilidade das automações.
                  </p>
                  <div className="mt-6 flex justify-center">
                    <div className="relative flex size-52 items-center justify-center rounded-3xl border border-border bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                      <QrCode className="size-20 text-slate-300 dark:text-slate-600" />
                      <span className="absolute bottom-3 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-primary shadow-sm dark:bg-slate-900/80">
                        Clique em gerar
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="mb-8 flex gap-4 rounded-xl border border-primary/20 bg-primary/5 p-6 dark:bg-primary/10">
            <Lightbulb className="size-6 shrink-0 text-primary" />
            <div>
              <h4 className="mb-1 text-sm font-bold text-primary">
                Dica de Estabilidade
              </h4>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                Mantenha seu celular conectado à internet e evite fechar o aplicativo do
                WhatsApp para garantir que todas as mensagens sejam entregues no horário
                correto.
              </p>
            </div>
          </div>

          {toast && (
            <p
              className={cn(
                'mb-4 text-sm',
                toast.type === 'error' ? 'text-red-500' : 'text-emerald-600'
              )}
            >
              {toast.message}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Link href="/settings">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl px-6 py-2.5 font-bold text-slate-900 hover:bg-slate-200 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Voltar
              </Button>
            </Link>
            <Button
              type="button"
              className="rounded-xl px-6 py-2.5 font-bold shadow-lg shadow-primary/20"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['whatsapp'] })}
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
