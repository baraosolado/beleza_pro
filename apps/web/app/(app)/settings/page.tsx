'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Award,
  Bell,
  Camera,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Store,
  User,
} from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button, Card, Input } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const profileSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
  businessInstagram: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal('')),
  businessPhone: z.string().optional(),
  businessPixKey: z.string().optional(),
  businessAddress: z.string().optional(),
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
  businessCategory?: string | null;
  businessInstagram?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessPixKey?: string | null;
  businessAddress?: string | null;
  avatarUrl?: string | null;
  workingHours?: Record<string, { start: string; end: string } | null>;
  createdAt?: string;
};

const PLAN_LABELS: Record<string, { name: string; price: string; description: string }> = {
  trial: {
    name: 'Plano Trial',
    price: 'R$ 0',
    description: 'Teste gratuito com funcionalidades essenciais por tempo limitado.',
  },
  basic: {
    name: 'Plano Basic',
    price: 'R$ 29,90',
    description: 'Ideal para começar: agenda, clientes e cobranças básicas.',
  },
  pro: {
    name: 'Plano Pro',
    price: 'R$ 49,90',
    description: 'Ideal para salões em crescimento com até 5 profissionais.',
  },
};

const DAYS = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const;

type TabKey = 'profile' | 'hours' | 'whatsapp' | 'notifications' | 'plan' | 'security';

type WorkingHoursState = Record<string, { start: string; end: string } | null>;

const defaultWorkingHours = (): WorkingHoursState => ({
  monday: { start: '09:00', end: '19:00' },
  tuesday: { start: '09:00', end: '19:00' },
  wednesday: { start: '09:00', end: '19:00' },
  thursday: { start: '09:00', end: '19:00' },
  friday: { start: '09:00', end: '19:00' },
  saturday: { start: '09:00', end: '17:00' },
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    setAvatarPreview(settings?.avatarUrl ?? null);
  }, [settings?.avatarUrl]);

  const profileMutation = useMutation({
    mutationFn: (body: ProfileFormData) =>
      api.put('/settings', {
        name: body.name,
        phone: body.phone || undefined,
        businessName: body.businessName || undefined,
        businessCategory: body.businessCategory?.trim() || undefined,
        businessInstagram: body.businessInstagram?.trim() || undefined,
        businessEmail: body.businessEmail?.trim() || undefined,
        businessPhone: body.businessPhone?.trim() || undefined,
        businessPixKey: body.businessPixKey?.trim() || undefined,
        businessAddress: body.businessAddress?.trim() || undefined,
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

  const avatarMutation = useMutation({
    mutationFn: (avatarUrl: string | null) => api.put('/settings', { avatarUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setToast({ type: 'success', message: 'Foto de perfil atualizada.' });
    },
    onError: () => {
      setToast({ type: 'error', message: 'Erro ao atualizar foto de perfil.' });
    },
  });

  const onAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Selecione PNG, JPG ou WEBP.');
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setAvatarError('A imagem deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        setAvatarError('Não foi possível ler a imagem.');
        return;
      }
      setAvatarError(null);
      setAvatarPreview(result);
      avatarMutation.mutate(result);
    };
    reader.onerror = () => setAvatarError('Não foi possível ler a imagem.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const removeAvatar = () => {
    setAvatarError(null);
    setAvatarPreview(null);
    avatarMutation.mutate(null);
  };

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
    reset: resetProfileForm,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: settings
      ? {
          name: settings.name,
          phone: settings.phone ?? '',
          businessName: settings.businessName ?? '',
          businessCategory: settings.businessCategory ?? '',
          businessInstagram: settings.businessInstagram ?? '',
          businessEmail: settings.businessEmail ?? '',
          businessPhone: settings.businessPhone ?? '',
          businessPixKey: settings.businessPixKey ?? '',
          businessAddress: settings.businessAddress ?? '',
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
      <Header title="Configurações do Sistema" />
      <main className="flex flex-1 flex-col gap-8 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-1 min-h-0 gap-8">
          {/* Internal Tab Navigation Sidebar */}
          <nav className="w-64 h-fit shrink-0 rounded-2xl border border-border bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all',
                  activeTab === key && key !== 'whatsapp'
                    ? 'bg-primary/10 font-bold text-primary'
                    : 'font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="min-h-0 min-w-0 flex-1 flex flex-col overflow-y-auto">
            {activeTab === 'profile' && (
              <div className="max-w-5xl w-full">
                {/* Breadcrumb no header da área de conteúdo */}
                <div className="mb-6 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Configurações</span>
                  <ChevronRight className="size-4" />
                  <span className="font-bold text-slate-900 dark:text-slate-100">Meu Perfil</span>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  {/* Profile Header Section */}
                  <div className="border-b border-border/60 bg-slate-50/50 p-8 dark:border-slate-800 dark:bg-slate-800/30 md:flex md:flex-row md:items-center md:gap-8">
                    <div className="relative flex justify-center md:justify-start">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Foto de perfil"
                          className="size-32 rounded-full object-cover shadow-lg"
                        />
                      ) : (
                        <div
                          className="size-32 rounded-full bg-primary flex items-center justify-center text-4xl font-bold text-white shadow-lg"
                          aria-hidden
                        >
                          {settings?.name?.slice(0, 2).toUpperCase() ?? '?'}
                        </div>
                      )}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={onAvatarFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute bottom-0 right-0 size-10 rounded-full border border-border bg-white shadow-md hover:text-primary transition-colors flex items-center justify-center dark:border-slate-600 dark:bg-slate-700"
                        aria-label="Trocar foto"
                      >
                        <Camera className="size-5 text-slate-600 dark:text-slate-300" />
                      </button>
                      {avatarMutation.isPending && (
                        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs text-slate-500">
                          Enviando...
                        </span>
                      )}
                    </div>
                    <div className="mt-6 flex-1 text-center md:mt-0 md:text-left">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {settings?.name ?? '—'}
                        </h2>
                        <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {settings?.plan ? PLAN_LABELS[settings.plan]?.name ?? `Plano ${settings.plan}` : '—'}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-slate-500 dark:text-slate-400">
                        {settings?.businessName || '—'}
                      </p>
                      {settings?.createdAt && (
                        <p className="mt-1 text-sm text-slate-400">
                          Membro desde {format(new Date(settings.createdAt), "MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <div className="mt-6 flex justify-center md:mt-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Alterar Senha
                      </button>
                    </div>
                  </div>

                  {/* Form Content */}
                  <form
                    onSubmit={handleSubmit((data) => profileMutation.mutate(data))}
                    className="p-8 space-y-10"
                  >
                    {/* Dados Pessoais */}
                    <section>
                      <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                        <User className="size-5 text-primary" />
                        Dados Pessoais
                      </h3>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Nome Completo
                          </label>
                          <input
                            type="text"
                            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            {...register('name')}
                          />
                          {errors.name?.message && (
                            <p className="text-sm text-red-500">{errors.name.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            E-mail
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              disabled
                              value={settings?.email ?? ''}
                              className="w-full cursor-not-allowed rounded-lg border border-border bg-slate-50 pr-10 py-2.5 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            />
                            <Lock className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          <p className="text-xs text-slate-500">Alterar e-mail: entre em contato com o suporte.</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Telefone
                          </label>
                          <input
                            type="text"
                            placeholder="(00) 00000-0000"
                            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            {...register('phone')}
                          />
                          {errors.phone?.message && (
                            <p className="text-sm text-red-500">{errors.phone.message}</p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Dados do Negócio */}
                    <section>
                      <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                        <Store className="size-5 text-primary" />
                        Dados do Negócio
                      </h3>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Nome do Studio
                          </label>
                          <input
                            type="text"
                            placeholder="Ex.: Studio Ana Rodrigues"
                            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            {...register('businessName')}
                          />
                          {errors.businessName?.message && (
                            <p className="text-sm text-red-500">{errors.businessName.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Categoria
                          </label>
                          <select
                            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            {...register('businessCategory')}
                          >
                            <option value="">Selecione</option>
                            <option value="Manicure & Estética">Manicure & Estética</option>
                            <option value="Cabelo & Barba">Cabelo & Barba</option>
                            <option value="Maquiagem">Maquiagem</option>
                            <option value="Massagem & Bem-estar">Massagem & Bem-estar</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Instagram
                          </label>
                          <input
                            type="text"
                            placeholder="@seu.studio"
                            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            {...register('businessInstagram')}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            E-mail do Negócio
                          </label>
                          <input
                            type="email"
                            placeholder="contato@seu.studio"
                            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            {...register('businessEmail')}
                          />
                          {errors.businessEmail?.message && (
                            <p className="text-sm text-red-500">{errors.businessEmail.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Telefone do Negócio
                          </label>
                          <input
                            type="text"
                            placeholder="(11) 99999-9999"
                            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            {...register('businessPhone')}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Chave Pix
                          </label>
                          <input
                            type="text"
                            placeholder="E-mail, CPF ou celular"
                            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            {...register('businessPixKey')}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Endereço Profissional
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Rua, número - Bairro, Cidade - UF"
                              className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              {...register('businessAddress')}
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    {toast && (
                      <p
                        className={cn(
                          'text-sm',
                          toast.type === 'error' ? 'text-red-500' : 'text-emerald-600'
                        )}
                      >
                        {toast.message}
                      </p>
                    )}
                    {avatarError && <p className="text-sm text-red-500">{avatarError}</p>}
                    {avatarPreview && (
                      <div className="flex justify-start">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={removeAvatar}
                          isLoading={avatarMutation.isPending}
                        >
                          Remover foto
                        </Button>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-4 border-t border-border bg-slate-50 p-8 -mx-8 -mb-8 mt-10 dark:border-slate-800 dark:bg-slate-800/50">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                        onClick={() =>
                          resetProfileForm(
                            settings
                              ? {
                                  name: settings.name,
                                  phone: settings.phone ?? '',
                                  businessName: settings.businessName ?? '',
                                  businessCategory: settings.businessCategory ?? '',
                                  businessInstagram: settings.businessInstagram ?? '',
                                  businessEmail: settings.businessEmail ?? '',
                                  businessPhone: settings.businessPhone ?? '',
                                  businessPixKey: settings.businessPixKey ?? '',
                                  businessAddress: settings.businessAddress ?? '',
                                }
                              : undefined
                          )
                        }
                      >
                        Descartar
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-lg bg-primary px-8 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
                        isLoading={profileMutation.isPending}
                      >
                        Salvar Alterações
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'hours' && (
              <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-border/60 p-8 dark:border-slate-800">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Horários de Atendimento
                  </h3>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Defina seus horários de trabalho e intervalos de descanso para cada dia da semana.
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                  <div className="space-y-4">
                    {DAYS.map((day) => {
                      const value = workingHours[day.key];
                      const enabled = value !== null;
                      const start = value?.start ?? '09:00';
                      const end = value?.end ?? '19:00';
                      return (
                        <div
                          key={day.key}
                          className={cn(
                            'flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4',
                            enabled
                              ? 'border-border/60 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20'
                              : 'border-border bg-slate-100 opacity-60 dark:border-slate-800 dark:bg-slate-800/50'
                          )}
                        >
                          <div className="flex min-w-[140px] items-center gap-4">
                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                className="sr-only peer"
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
                              <div className="relative h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-primary dark:border-gray-600 dark:bg-slate-700" />
                            </label>
                            <span
                              className={cn(
                                'text-base font-semibold',
                                enabled
                                  ? 'text-slate-700 dark:text-slate-200'
                                  : 'text-slate-400 dark:text-slate-500'
                              )}
                            >
                              {day.label}
                            </span>
                          </div>
                          {enabled ? (
                            <>
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                  value={start}
                                  onChange={(e) =>
                                    updateDayHours(day.key, true, e.target.value, end)
                                  }
                                />
                                <span className="text-slate-400">até</span>
                                <input
                                  type="time"
                                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                  value={end}
                                  onChange={(e) =>
                                    updateDayHours(day.key, true, start, e.target.value)
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                              >
                                <Plus className="size-[18px]" />
                                Adicionar Intervalo
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 grayscale">
                                <input
                                  type="time"
                                  className="cursor-not-allowed rounded-lg border border-border bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-900"
                                  disabled
                                  value="00:00"
                                />
                                <span className="text-slate-400">até</span>
                                <input
                                  type="time"
                                  className="cursor-not-allowed rounded-lg border border-border bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-900"
                                  disabled
                                  value="00:00"
                                />
                              </div>
                              <span className="text-xs font-medium italic text-slate-400">
                                Fechado
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {toast && activeTab === 'hours' && (
                  <p
                    className={cn(
                      'px-8 text-sm',
                      toast.type === 'error' ? 'text-red-500' : 'text-emerald-600'
                    )}
                  >
                    {toast.message}
                  </p>
                )}
                <div className="flex justify-end gap-3 border-t border-border/60 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl px-6 py-2 font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
                    onClick={() => setActiveTab('profile')}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl px-8 py-2 font-bold shadow-lg shadow-primary/30 active:scale-95"
                    onClick={() => hoursMutation.mutate(workingHours)}
                    isLoading={hoursMutation.isPending}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </section>
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
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Plano e Faturamento
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Gerencie sua assinatura, métodos de pagamento e faturas.
                  </p>
                </div>

                {/* Card Plano Atual */}
                <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-3 text-primary">
                        <Award className="size-6" />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                            Plano Atual
                          </p>
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                            Ativo
                          </span>
                        </div>
                        <h3 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">
                          {settings?.plan
                            ? PLAN_LABELS[settings.plan]?.name ?? `Plano ${settings.plan}`
                            : '—'}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                          {settings?.plan
                            ? PLAN_LABELS[settings.plan]?.description ?? '—'
                            : 'Carregando...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                          {settings?.plan
                            ? PLAN_LABELS[settings.plan]?.price ?? '—'
                            : '—'}
                          <span className="text-sm font-normal text-slate-500">/mês</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Próxima renovação:{' '}
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            —
                          </span>
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Button className="rounded-lg px-4 py-2 text-sm font-semibold">
                          Alterar Plano
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formas de Pagamento */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                    <CreditCard className="size-5 text-slate-400" />
                    Formas de Pagamento
                  </h3>
                  <div className="rounded-xl border border-border bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-border/60 p-4 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-8 w-12 items-center justify-center rounded bg-slate-100 p-1 dark:bg-slate-800">
                            <span className="text-[10px] font-bold italic text-blue-800">
                              VISA
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              Visa terminado em 4242
                            </p>
                            <p className="text-xs text-slate-500">
                              Expira em 12/2028 • Principal
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          <Pencil className="size-4" />
                          Editar
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:text-primary"
                    >
                      <Plus className="size-4" />
                      Adicionar novo cartão
                    </button>
                  </div>
                </div>

                {/* Histórico de Faturas */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                    <Receipt className="size-5 text-slate-400" />
                    Histórico de Faturas
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-border bg-white dark:border-slate-800 dark:bg-slate-900">
                    <table className="w-full text-left">
                      <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-6 py-3">Data</th>
                          <th className="px-6 py-3">Valor</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-sm dark:divide-slate-800">
                        <tr>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            15 Mar, 2024
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                            R$ 49,90
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
                              <span className="size-1.5 rounded-full bg-green-600" />
                              Pago
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              className="text-slate-400 hover:text-primary"
                              aria-label="Baixar fatura"
                            >
                              <Download className="size-5" />
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            15 Fev, 2024
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                            R$ 49,90
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
                              <span className="size-1.5 rounded-full bg-green-600" />
                              Pago
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              className="text-slate-400 hover:text-primary"
                              aria-label="Baixar fatura"
                            >
                              <Download className="size-5" />
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            15 Jan, 2024
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                            R$ 49,90
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                              <span className="size-1.5 animate-pulse rounded-full bg-amber-600" />
                              Processando
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              className="text-slate-400 hover:text-primary"
                              aria-label="Mais opções"
                            >
                              <MoreHorizontal className="size-5" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Rodapé Cancelar assinatura */}
                <div className="flex flex-col items-center justify-center gap-4 border-t border-border pt-8 dark:border-slate-800">
                  <p className="max-w-md text-center text-xs text-slate-400">
                    Ao cancelar sua assinatura, você perderá acesso às funcionalidades
                    premium no final do ciclo de faturamento atual.
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-400 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-red-500 hover:decoration-red-400"
                  >
                    Cancelar assinatura do Beleza Pro
                  </button>
                </div>
              </div>
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
