'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Bell,
  Clock,
  CreditCard,
  Lock,
  MessageCircle,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button, Card, Input } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  phone: z.string().optional(),
  businessName: z.string().optional(),
});

const securitySchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type SecurityFormData = z.infer<typeof securitySchema>;

function SecurityForm({
  onSuccess,
  onError,
  toast,
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
  toast: { type: 'error' | 'success'; message: string } | null;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
  });

  const mutation = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api.put('/settings/password', body),
    onSuccess: () => {
      reset();
      onSuccess();
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erro ao alterar senha'
          : 'Erro ao alterar senha';
      onError(message);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) =>
        mutation.mutate({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        })
      )}
      className="max-w-md space-y-4"
    >
      <Input
        label="Senha atual"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <Input
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Input
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      {toast && (
        <p
          className={
            toast.type === 'error' ? 'text-sm text-red-500' : 'text-sm text-emerald-600'
          }
        >
          {toast.message}
        </p>
      )}
      <Button type="submit" isLoading={mutation.isPending}>
        Alterar senha
      </Button>
    </form>
  );
}

type Settings = {
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  businessName: string | null;
  workingHours?: Record<string, { start: string; end: string } | null>;
};

const DAYS = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const;

type TabKey = 'profile' | 'hours' | 'whatsapp' | 'notifications' | 'plan' | 'security';

type WorkingHoursState = Record<string, { start: string; end: string } | null>;

const defaultWorkingHours = (): WorkingHoursState => ({
  monday: { start: '08:00', end: '18:00' },
  tuesday: { start: '08:00', end: '18:00' },
  wednesday: { start: '08:00', end: '18:00' },
  thursday: { start: '08:00', end: '18:00' },
  friday: { start: '08:00', end: '18:00' },
  saturday: { start: '08:00', end: '12:00' },
  sunday: null,
});

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [toast, setToast] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHoursState>(defaultWorkingHours);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Settings>('/settings').then((r) => r.data),
  });

  useEffect(() => {
    if (settings?.workingHours && typeof settings.workingHours === 'object') {
      const wh = settings.workingHours as Record<string, { start?: string; end?: string } | null>;
      setWorkingHours((prev) => ({
        ...defaultWorkingHours(),
        ...prev,
        ...Object.fromEntries(
          DAYS.map((d) => [
            d.key,
            wh[d.key] && wh[d.key]?.start && wh[d.key]?.end
              ? { start: wh[d.key]!.start!, end: wh[d.key]!.end! }
              : null,
          ])
        ),
      }));
    }
  }, [settings?.workingHours]);

  const profileMutation = useMutation({
    mutationFn: (body: ProfileFormData) =>
      api.put('/settings', {
        name: body.name,
        phone: body.phone || undefined,
        businessName: body.businessName || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setToast({ type: 'success', message: 'Alterações salvas.' });
    },
    onError: (err: unknown) => {
      setToast({
        type: 'error',
        message:
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data
                ?.error ?? 'Erro ao salvar'
            : 'Erro ao salvar',
      });
    },
  });

  const hoursMutation = useMutation({
    mutationFn: (body: WorkingHoursState) =>
      api.put('/settings', { workingHours: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setToast({ type: 'success', message: 'Horários salvos.' });
    },
    onError: (err: unknown) => {
      setToast({
        type: 'error',
        message:
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data
                ?.error ?? 'Erro ao salvar'
            : 'Erro ao salvar',
      });
    },
  });

  const updateDayHours = (
    dayKey: string,
    enabled: boolean,
    start?: string,
    end?: string
  ) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]:
        enabled && start && end ? { start, end } : null,
    }));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: settings
      ? {
          name: settings.name,
          phone: settings.phone ?? '',
          businessName: settings.businessName ?? '',
        }
      : undefined,
  });

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: 'Perfil', icon: User },
    { key: 'hours', label: 'Horários', icon: Clock },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { key: 'notifications', label: 'Notificações', icon: Bell },
    { key: 'plan', label: 'Plano', icon: CreditCard },
    { key: 'security', label: 'Segurança', icon: Lock },
  ];

  return (
    <>
      <Header title="Configurações" subtitle="Seus dados e preferências" />
      <main className="flex-1 overflow-auto p-8">
        <div className="flex gap-8">
          <Card className="w-52 shrink-0 p-2">
            <nav className="flex flex-col gap-1">
              {tabs.map(({ key, label, icon: Icon }) => (
                <Link
                  key={key}
                  href={key === 'whatsapp' ? '/settings/whatsapp' : '#'}
                  onClick={(e) => {
                    if (key !== 'whatsapp') {
                      e.preventDefault();
                      setActiveTab(key);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    activeTab === key && key !== 'whatsapp'
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </Card>

          <div className="min-w-0 flex-1">
            {activeTab === 'profile' && (
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  Perfil
                </h2>
                <form
                  onSubmit={handleSubmit((data) => profileMutation.mutate(data))}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                        {settings?.name?.slice(0, 2).toUpperCase() ?? '?'}
                      </div>
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 rounded-full bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300"
                        aria-label="Trocar avatar"
                      >
                        <User className="size-4" />
                      </button>
                    </div>
                  </div>
                  <Input
                    label="Nome Completo"
                    error={errors.name?.message}
                    {...register('name')}
                  />
                  <Input
                    label="Nome do Studio"
                    error={errors.businessName?.message}
                    {...register('businessName')}
                  />
                  <Input
                    label="Telefone"
                    error={errors.phone?.message}
                    {...register('phone')}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      E-mail
                    </label>
                    <input
                      type="email"
                      disabled
                      value={settings?.email ?? ''}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Alterar e-mail entre em contato com o suporte.
                    </p>
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
                  <Button
                    type="submit"
                    isLoading={profileMutation.isPending}
                  >
                    Salvar Alterações
                  </Button>
                </form>
              </Card>
            )}

            {activeTab === 'hours' && (
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  Horários de Atendimento
                </h2>
                <div className="space-y-4">
                  {DAYS.map((day) => {
                    const value = workingHours[day.key];
                    const enabled = value !== null;
                    const start = value?.start ?? '08:00';
                    const end = value?.end ?? '18:00';
                    const options = Array.from({ length: 13 }, (_, h) => {
                      const hour = h + 8;
                      const v = `${hour.toString().padStart(2, '0')}:00`;
                      return { value: v, label: v };
                    });
                    return (
                      <div
                        key={day.key}
                        className={cn(
                          'flex flex-wrap items-center gap-4',
                          !enabled && 'opacity-60'
                        )}
                      >
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) =>
                              updateDayHours(
                                day.key,
                                e.target.checked,
                                e.target.checked ? start : undefined,
                                e.target.checked ? end : undefined
                              )
                            }
                          />
                          <span className="w-24 font-medium text-slate-700">
                            {day.label}
                          </span>
                        </label>
                        <select
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={start}
                          disabled={!enabled}
                          onChange={(e) =>
                            updateDayHours(day.key, enabled, e.target.value, end)
                          }
                        >
                          {options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-slate-400">até</span>
                        <select
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={end}
                          disabled={!enabled}
                          onChange={(e) =>
                            updateDayHours(day.key, enabled, start, e.target.value)
                          }
                        >
                          {options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
                {toast && activeTab === 'hours' && (
                  <p
                    className={cn(
                      'mt-4 text-sm',
                      toast.type === 'error' ? 'text-red-500' : 'text-emerald-600'
                    )}
                  >
                    {toast.message}
                  </p>
                )}
                <Button
                  type="button"
                  className="mt-6"
                  onClick={() => hoursMutation.mutate(workingHours)}
                  isLoading={hoursMutation.isPending}
                >
                  Salvar Horários
                </Button>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  Notificações
                </h2>
                <p className="text-slate-500">
                  Configure lembretes e notificações por e-mail e WhatsApp.
                </p>
              </Card>
            )}

            {activeTab === 'plan' && (
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  Plano
                </h2>
                <p className="text-slate-600">
                  Plano atual: <strong>{settings?.plan ?? '—'}</strong>
                </p>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  Alterar senha
                </h2>
                <SecurityForm
                  onSuccess={() =>
                    setToast({ type: 'success', message: 'Senha alterada com sucesso.' })
                  }
                  onError={(message) => setToast({ type: 'error', message })}
                  toast={toast}
                />
              </Card>
            )}

            {activeTab === 'whatsapp' && (
              <p className="text-slate-500">
                <Link
                  href="/settings/whatsapp"
                  className="font-medium text-primary hover:underline"
                >
                  Ir para configuração do WhatsApp →
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
