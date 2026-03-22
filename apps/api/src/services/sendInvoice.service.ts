import { prisma } from '../db/prisma/client.js';
import { env } from '../config/env.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

type InvoicePayload = {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
  };
  charges: Array<{
    id: string;
    description: string;
    amount: number;
    dueDate: string;
  }>;
};

/** Estrutura JSON esperada pelo webhook n8n para gerar o PDF da cobrança */
export type WebhookInvoicePayload = {
  numero_cobranca: string;
  data_emissao: string;
  data_atendimento: string;
  data_vencimento: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string;
  profissional_nome: string;
  pix_chave: string;
  subtotal: string;
  desconto_percentual: string;
  desconto_valor: string;
  total: string;
  observacoes: string;
  salao_endereco: string;
  salao_telefone: string;
  salao_instagram: string;
  salao_email: string;
  servicos: Array<{
    nome: string;
    descricao: string;
    qtd: number;
    valor_unit: string;
    valor_total: string;
  }>;
};

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBr(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPhoneBr(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    // +55DD9NNNNNNNN
    const ddd = digits.slice(2, 4);
    const first = digits.slice(4, 5);
    const middle = digits.slice(5, 9);
    const end = digits.slice(9, 13);
    return `(${ddd}) ${first} ${middle}-${end}`;
  }
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const first = digits.slice(2, 3);
    const middle = digits.slice(3, 7);
    const end = digits.slice(7, 11);
    return `(${ddd}) ${first} ${middle}-${end}`;
  }
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const middle = digits.slice(2, 6);
    const end = digits.slice(6, 10);
    return `(${ddd}) ${middle}-${end}`;
  }
  return raw;
}

export async function getInvoiceData(
  userId: string,
  clientId: string,
  chargeIds: string[]
): Promise<ServiceResult<InvoicePayload>> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
  });
  if (!client) {
    return { error: 'Cliente não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }

  const charges = await prisma.charge.findMany({
    where: {
      id: { in: chargeIds },
      clientId,
      userId,
      status: { notIn: ['paid', 'cancelled'] },
    },
    include: { appointment: { select: { service: { select: { name: true } }, scheduledAt: true } } },
  });

  if (charges.length !== chargeIds.length) {
    return {
      error: 'Uma ou mais cobranças não encontradas ou não estão em aberto',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    };
  }

  const payload: InvoicePayload = {
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
    },
    charges: charges.map((c) => ({
      id: c.id,
      description: c.description ?? c.appointment?.service?.name ?? 'Cobrança',
      amount: Number(c.amount),
      dueDate: c.dueDate.toISOString().slice(0, 10),
    })),
  };

  return { data: payload };
}

/** Busca dados completos (cliente, cobranças com atendimento/serviço e usuário/salão) para montar o payload do webhook */
async function getInvoiceDataForWebhook(
  userId: string,
  clientId: string,
  chargeIds: string[]
): Promise<
  ServiceResult<{
    client: { name: string; phone: string; email: string | null };
    charges: Array<{
      amount: number;
      description: string | null;
      dueDate: Date;
      appointment: { scheduledAt: Date; service: { name: string } } | null;
    }>;
    user: {
      name: string;
      phone: string | null;
      email: string;
      businessName: string | null;
      businessCategory: string | null;
      businessInstagram: string | null;
      businessEmail: string | null;
      businessPhone: string | null;
      businessPixKey: string | null;
      businessAddress: string | null;
    };
  }>
> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { name: true, phone: true, email: true },
  });
  if (!client) {
    return { error: 'Cliente não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }

  const charges = await prisma.charge.findMany({
    where: {
      id: { in: chargeIds },
      clientId,
      userId,
      status: { notIn: ['paid', 'cancelled'] },
    },
    include: {
      appointment: {
        select: { scheduledAt: true, service: { select: { name: true } } },
      },
    },
  });

  if (charges.length !== chargeIds.length) {
    return {
      error: 'Uma ou mais cobranças não encontradas ou não estão em aberto',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    // Campos adicionais do negócio (categoria, Instagram, etc.) foram adicionados via migration
    // e podem ainda não aparecer no tipo gerado do Prisma se a geração não foi rodada.
    // Por isso usamos 'as any' aqui apenas na seleção.
    select: {
      name: true,
      phone: true,
      email: true,
      businessName: true,
      businessCategory: true,
      businessInstagram: true,
      businessEmail: true,
      businessPhone: true,
      businessPixKey: true,
      businessAddress: true,
    } as any,
  });
  if (!user) {
    return { error: 'Usuário não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }

  return {
    data: {
      client: { name: client.name, phone: client.phone, email: client.email },
      charges: charges.map((c) => ({
        amount: Number(c.amount),
        description: c.description,
        dueDate: c.dueDate,
        appointment: c.appointment
          ? {
              scheduledAt: c.appointment.scheduledAt,
              service: c.appointment.service,
            }
          : null,
      })),
      user: {
        name: (user as any).name,
        phone: (user as any).phone,
        email: (user as any).email,
        businessName: (user as any).businessName,
        businessCategory: (user as any).businessCategory ?? null,
        businessInstagram: (user as any).businessInstagram ?? null,
        businessEmail: (user as any).businessEmail ?? null,
        businessPhone: (user as any).businessPhone ?? null,
        businessPixKey: (user as any).businessPixKey ?? null,
        businessAddress: (user as any).businessAddress ?? null,
      },
    },
  };
}

/** Monta o JSON exatamente no formato esperado pelo webhook n8n */
function buildWebhookPayload(data: {
  client: { name: string; phone: string; email: string | null };
  charges: Array<{
    amount: number;
    description: string | null;
    dueDate: Date;
    appointment: { scheduledAt: Date; service: { name: string } } | null;
  }>;
  user: {
    name: string;
    phone: string | null;
    email: string;
    businessName: string | null;
    businessCategory: string | null;
    businessInstagram: string | null;
    businessEmail: string | null;
    businessPhone: string | null;
    businessPixKey: string | null;
    businessAddress: string | null;
  };
  firstChargeId: string;
}): WebhookInvoicePayload {
  const now = new Date();
  const subtotalValue = data.charges.reduce((s, c) => s + c.amount, 0);
  const descontoPercentual = 0;
  const descontoValor = 0;
  const totalValue = subtotalValue - descontoValor;

  const dataAtendimento = data.charges[0]?.appointment?.scheduledAt ?? data.charges[0]?.dueDate ?? now;
  const dataVencimento = data.charges.length
    ? data.charges.reduce((max, c) => (c.dueDate > max ? c.dueDate : max), data.charges[0].dueDate)
    : now;

  const numeroCobranca =
    'COB-' + now.getFullYear() + '-' + data.firstChargeId.replace(/-/g, '').slice(0, 8).toUpperCase();

  const businessPhone = data.user.businessPhone ?? data.user.phone ?? '';
  const businessEmail = data.user.businessEmail ?? data.user.email;
  const pixKey = data.user.businessPixKey ?? businessPhone;
  const formattedClientPhone = formatPhoneBr(data.client.phone);
  const formattedBusinessPhone = formatPhoneBr(businessPhone);

  return {
    numero_cobranca: numeroCobranca,
    data_emissao: formatDateBr(now),
    data_atendimento: formatDateBr(dataAtendimento),
    data_vencimento: formatDateBr(dataVencimento),
    cliente_nome: data.client.name,
    cliente_telefone: formattedClientPhone,
    cliente_email: data.client.email ?? '',
    profissional_nome: data.user.name,
    pix_chave: pixKey,
    subtotal: formatBrl(subtotalValue),
    desconto_percentual: descontoPercentual ? `${descontoPercentual}%` : '0%',
    desconto_valor: formatBrl(descontoValor),
    total: formatBrl(totalValue),
    observacoes: 'Pagamento via Pix preferencial. Em caso de dúvidas, entre em contato.',
    salao_endereco: data.user.businessAddress ?? '',
    salao_telefone: formattedBusinessPhone,
    salao_instagram: data.user.businessInstagram ?? '',
    salao_email: businessEmail,
    servicos: data.charges.map((c) => {
      const nome = c.appointment?.service?.name ?? c.description ?? 'Cobrança';
      const valor = c.amount;
      return {
        nome,
        descricao: c.description ?? nome,
        qtd: 1,
        valor_unit: formatBrl(valor),
        valor_total: formatBrl(valor),
      };
    }),
  };
}

/**
 * Chama o webhook n8n com o JSON da cobrança (formato WebhookInvoicePayload).
 * Preview: n8n deve retornar { pdfUrl?: string } ou { pdfBase64?: string }.
 */
async function callN8nWebhookForPreview(
  url: string | undefined,
  body: WebhookInvoicePayload
): Promise<{ pdfUrl?: string; pdfBase64?: string; success?: boolean; error?: string }> {
  if (!url || url.length < 10) {
    console.warn(
      '[send-invoice] Webhook n8n não configurado (N8N_INVOICE_PREVIEW_WEBHOOK_URL ausente no .env)'
    );
    return { error: 'Webhook n8n não configurado' };
  }
  const urlDisplay = url.replace(/https?:\/\/[^/]+/, (m) => m.slice(0, 20) + '...');
  console.log('[send-invoice] Chamando webhook n8n (gerar PDF):', urlDisplay);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const raw = await res.json().catch(() => ({}));
    // n8n pode devolver objeto { pdfBase64 } ou array [{ pdfBase64 }]
    const data = Array.isArray(raw) ? (raw[0] as Record<string, unknown>) : (raw as Record<string, unknown>);
    if (!res.ok) {
      console.warn('[send-invoice] n8n respondeu com erro:', res.status, data);
      return { error: ((data as Record<string, unknown>).error as string) ?? `n8n retornou ${res.status}` };
    }
    console.log('[send-invoice] n8n respondeu OK:', res.status);
    // n8n pode devolver pdfBase64/pdfUrl na raiz ou dentro de .json (Respond to Webhook)
    const json = (data.json as Record<string, unknown>) ?? data;
    const rawPdfUrl = (json.pdfUrl ?? json.pdf_url) as string | undefined;
    let rawPdfBase64 = (json.pdfBase64 ?? json.pdf_base64) as string | undefined;
    if (typeof rawPdfBase64 === 'string') {
      rawPdfBase64 = rawPdfBase64.replace(/\s/g, '').trim();
    }
    return {
      pdfUrl: rawPdfUrl,
      pdfBase64: rawPdfBase64,
      success: (json.success as boolean) ?? data.success as boolean | undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao chamar n8n';
    console.error('[send-invoice] Erro ao chamar n8n:', err);
    return { error: message };
  }
}

/** Envio para o webhook de envio (WhatsApp) com o mesmo JSON do preview (WebhookInvoicePayload) */
async function callN8nWebhookSend(
  url: string | undefined,
  body: WebhookInvoicePayload
): Promise<{ success?: boolean; error?: string }> {
  if (!url || url.length < 10) {
    return { error: 'Webhook n8n não configurado' };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { error: (data.error as string) ?? `n8n retornou ${res.status}` };
    }
    return { success: (data.success as boolean) ?? true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao chamar n8n' };
  }
}

/** Gera o PDF via webhook n8n enviando o JSON no formato esperado (numero_cobranca, servicos, etc.) */
export async function requestPreview(
  userId: string,
  clientId: string,
  chargeIds: string[]
): Promise<ServiceResult<{ pdfUrl?: string; pdfBase64?: string }>> {
  const result = await getInvoiceDataForWebhook(userId, clientId, chargeIds);
  if (result.error) return result;

  const payload = buildWebhookPayload({
    client: result.data!.client,
    charges: result.data!.charges,
    user: result.data!.user,
    firstChargeId: chargeIds[0] ?? '',
  });

  const url = env.N8N_INVOICE_PREVIEW_WEBHOOK_URL;
  const response = await callN8nWebhookForPreview(url, payload);

  if (response.error) {
    return {
      error: response.error,
      code: 'N8N_ERROR',
      statusCode: 502,
    };
  }
  return {
    data: {
      pdfUrl: response.pdfUrl,
      pdfBase64: response.pdfBase64,
    },
  };
}

/**
 * Envia a conta pelo WhatsApp via n8n.
 * Usa o mesmo payload do preview (WebhookInvoicePayload).
 */
export async function requestSend(
  userId: string,
  clientId: string,
  chargeIds: string[]
): Promise<ServiceResult<{ success: boolean }>> {
  const result = await getInvoiceDataForWebhook(userId, clientId, chargeIds);
  if (result.error) return result;

  const url = env.N8N_INVOICE_SEND_WEBHOOK_URL;
  if (!url || url.length < 10) {
    return {
      error:
        'Envio por WhatsApp será implementado em breve. Configure N8N_INVOICE_SEND_WEBHOOK_URL quando o workflow n8n estiver pronto.',
      code: 'WEBHOOK_SEND_NOT_CONFIGURED',
      statusCode: 503,
    };
  }

  const response = await callN8nWebhookSend(url, {
    ...buildWebhookPayload({
      client: result.data!.client,
      charges: result.data!.charges,
      user: result.data!.user,
      firstChargeId: chargeIds[0] ?? '',
    }),
  });

  if (response.error) {
    return {
      error: response.error,
      code: 'N8N_ERROR',
      statusCode: 502,
    };
  }
  return { data: { success: response.success ?? true } };
}
