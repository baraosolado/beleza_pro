export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};

export const CHARGE_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

export const WA_TYPE_LABEL: Record<string, string> = {
  reminder: 'Lembrete',
  charge: 'Cobrança',
  confirmation: 'Confirmação',
  custom: 'Personalizada',
};

export const WA_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviada',
  failed: 'Falhou',
};

export const CONSORCIO_STATUS_LABEL: Record<string, string> = {
  elegivel: 'Elegível',
  sorteada: 'Sorteada',
};

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
