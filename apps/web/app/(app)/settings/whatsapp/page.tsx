'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Lightbulb, QrCode, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type QrResponse = {
  qrCode?: string;
  connected?: boolean;
  phone?: string;
};

export default function SettingsWhatsAppPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const { data: qrData, isLoading } = useQuery({
    queryKey: ['whatsapp', 'qrcode'],
    queryFn: () =>
      api.get<QrResponse>('/settings/whatsapp/qrcode').then((r) => r.data),
  });

  const connectMutation = useMutation({
    mutationFn: () => api.post('/settings/whatsapp/connect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp'] });
      setToast({
        type: 'success',
        message: 'Solicitação enviada. Verifique o QR Code.',
      });
    },
    onError: () => {
      setToast({ type: 'error', message: 'Erro ao conectar.' });
    },
  });

  const connected = qrData?.connected ?? false;
  const phone = qrData?.phone;

  return (
    <>
      <Header title="WhatsApp" />
      <main className="flex-1 min-h-0 overflow-y-auto p-8">
        <div className="mx-auto w-full max-w-4xl">
          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-sm text-slate-400">
            <Link href="/settings" className="hover:text-primary">
              Configurações
            </Link>
            <ChevronRight className="size-4" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              WhatsApp
            </span>
          </nav>

          {/* Page title */}
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              Conexão WhatsApp
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Vincule seu número para automatizar seus lembretes de agendamento.
            </p>
          </div>

          {/* QR Code / Connection Card */}
          <div className="mb-6 overflow-hidden rounded-xl border border-border bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 p-6 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {connected ? 'Conectado' : 'Pronto para conectar'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {connected
                    ? `Número vinculado: ${phone ?? '—'}`
                    : 'Escaneie o código abaixo com o seu celular.'}
                </p>
              </div>
              {isLoading ? (
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                  Carregando...
                </span>
              ) : connected ? (
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                  <span className="mr-2 size-2 rounded-full bg-emerald-500" />
                  Conectado
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                  <span className="mr-2 size-2 animate-pulse rounded-full bg-amber-500" />
                  Aguardando conexão
                </span>
              )}
            </div>

            <div className="p-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-6 py-12">
                  <div className="size-64 rounded-xl border-2 border-dashed border-border bg-slate-50 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-center">
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
                  {/* QR Code area */}
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <div className="flex size-64 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                        {qrData?.qrCode ? (
                          <img
                            src={qrData.qrCode}
                            alt="QR Code WhatsApp"
                            className="size-full object-contain p-2"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <QrCode className="size-14" />
                            <span className="text-xs font-medium uppercase tracking-wider">
                              QR Code Webhook
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex justify-center">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
                          onClick={() => connectMutation.mutate()}
                          disabled={connectMutation.isPending}
                        >
                          <RefreshCw
                            className={cn('size-5', connectMutation.isPending && 'animate-spin')}
                          />
                          {qrData?.qrCode ? 'Gerar Novo QR Code' : 'Gerar QR Code'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
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
                          Aponte a câmera para esta tela para{' '}
                          <strong>escanear o código</strong>
                        </p>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dica de Estabilidade */}
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

          {/* Footer buttons */}
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
