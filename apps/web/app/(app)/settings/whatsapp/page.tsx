'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

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
      setToast({ type: 'success', message: 'Solicitação enviada. Verifique o QR Code.' });
    },
    onError: () => {
      setToast({ type: 'error', message: 'Erro ao conectar.' });
    },
  });

  const connected = qrData?.connected ?? false;
  const phone = qrData?.phone;

  return (
    <>
      <Header
        title="WhatsApp"
        subtitle="Conecte sua instância para lembretes e cobranças"
      />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'size-3 rounded-full',
                connected ? 'bg-emerald-500' : 'bg-red-500'
              )}
            />
            <span className="font-medium text-slate-800">
              {connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          {isLoading ? (
            <p className="text-slate-500">Carregando...</p>
          ) : connected && phone ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-slate-600">Número: {phone}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 border-red-200 text-red-600 hover:bg-red-50"
              >
                Desconectar
              </Button>
            </div>
          ) : qrData?.qrCode ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 text-center">
              <p className="mb-4 text-sm text-slate-600">
                Escaneie o QR Code com o WhatsApp
              </p>
              <img
                src={qrData.qrCode}
                alt="QR Code WhatsApp"
                className="mx-auto max-w-[200px]"
              />
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-6">
              <p className="mb-4 text-sm text-slate-600">
                Conecte sua instância uazapi para enviar lembretes e cobranças
                pelo WhatsApp.
              </p>
              <Button
                onClick={() => connectMutation.mutate()}
                isLoading={connectMutation.isPending}
                variant="outline"
              >
                Conectar WhatsApp
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ⚠️ Recomendamos usar um número de WhatsApp secundário para evitar
            bloqueios.
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

          <Link
            href="/settings"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            ← Voltar às configurações
          </Link>
        </div>
      </main>
    </>
  );
}
