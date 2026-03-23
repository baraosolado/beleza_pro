'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, User } from 'lucide-react';

import { Button, Modal } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z.object({
  clientId: z.string().uuid('Selecione uma cliente'),
});

type FormData = z.infer<typeof schema>;

type AddParticipantModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const fieldClass =
  'w-full rounded-xl border border-border bg-app-surface py-2.5 text-sm text-ink-primary outline-none transition-all placeholder:text-ink-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20';

/**
 * Modal para vincular uma cliente cadastrada ao ciclo atual do consórcio.
 */
export function AddParticipantModal({
  open,
  onOpenChange,
}: AddParticipantModalProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { clientId: '' },
  });

  const clientId = watch('clientId');

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () =>
      api
        .get<
          { id: string; name: string; phone: string }[] | { items: { id: string; name: string; phone: string }[] }
        >('/clients?limit=200')
        .then((r) => r.data),
    enabled: open,
  });

  const clients = Array.isArray(clientsData)
    ? clientsData
    : (clientsData as { items?: { id: string; name: string; phone: string }[] })?.items ?? [];

  const filteredClients = clients.filter((c) =>
    `${c.name} ${c.phone}`.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find((c) => c.id === clientId);

  const mutation = useMutation({
    mutationFn: (body: { clientId: string }) =>
      api.post('/consorcio/participants', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consorcio'] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { error?: string } } };
      setSubmitError(ax.response?.data?.error ?? 'Não foi possível adicionar a participante');
    },
  });

  useEffect(() => {
    if (!open) {
      reset({ clientId: '' });
      setClientSearch('');
      setDropdownOpen(false);
      setSubmitError(null);
    }
  }, [open, reset]);

  const onSubmit = (data: FormData) => {
    setSubmitError(null);
    mutation.mutate({ clientId: data.clientId });
  };

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Nova participante"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-ink-secondary">
          Escolha uma cliente da sua base. Ela passa a fazer parte do ciclo atual do consórcio.
        </p>

        <div className="relative">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-secondary">
            Cliente
          </label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              fieldClass,
              'flex w-full items-center justify-between gap-2 px-3 text-left'
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <User className="size-4 shrink-0 text-ink-muted" />
              <span className="truncate">
                {selectedClient ? selectedClient.name : 'Selecionar cliente…'}
              </span>
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-ink-muted transition-transform',
                dropdownOpen && 'rotate-180'
              )}
            />
          </button>
          {errors.clientId && (
            <p className="mt-1 text-xs font-medium text-danger">{errors.clientId.message}</p>
          )}

          {dropdownOpen && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-hidden rounded-xl border border-border bg-app-surface shadow-lg">
              <div className="border-b border-border p-2">
                <input
                  type="search"
                  placeholder="Buscar por nome ou telefone…"
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <ul className="max-h-44 overflow-y-auto py-1">
                {filteredClients.length === 0 ? (
                  <li className="px-3 py-4 text-center text-sm text-ink-muted">
                    Nenhuma cliente encontrada.
                  </li>
                ) : (
                  filteredClients.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-app-bg"
                        onClick={() => {
                          setValue('clientId', c.id, { shouldValidate: true });
                          setDropdownOpen(false);
                          setClientSearch('');
                        }}
                      >
                        <span className="font-semibold text-ink-primary">{c.name}</span>
                        <span className="text-xs text-ink-muted">{c.phone}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {submitError && (
          <p className="rounded-lg bg-danger-light/40 px-3 py-2 text-sm text-danger">{submitError}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Adicionando…' : 'Adicionar ao ciclo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
