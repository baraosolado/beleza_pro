import { env } from '../config/env.js';
import { mapConsorcioDbError } from '../lib/consorcio-db-errors.js';
import * as whatsapp from '../integrations/whatsapp/index.js';
import {
  type ConsorcioDrawN8nSolicitacaoPayload,
  type ConsorcioN8nAutomationStored,
  type ConsorcioSendWhatsappPayload,
  inferMediaMimeFromBase64,
  postConsorcioDrawSolicitacaoWebhook,
  postConsorcioRevistaClienteWebhook,
  postConsorcioSendWhatsappWebhook,
} from '../integrations/n8nConsorcioDraw.js';
import {
  postConsorcioPdfUploadWebhook,
  postConsorcioPdfUploadWebhookMultipart,
} from '../integrations/n8nConsorcioPdfUpload.js';
import { prisma } from '../db/prisma/client.js';
import { addWhatsAppJob, isRedisEnabled } from '../jobs/queue.js';

/** Limite aproximado (~10 MB em base64) para preview no Postgres. */
const MAX_VIDEO_PREVIEW_BASE64_CHARS = 14_000_000;

/**
 * Limite aproximado para upload de PDF.
 * Regra: base64 ≈ bytes * 4/3.
 * 60MB bytes => ~80MB chars. Aplicamos headroom para variações.
 */
const MAX_PDF_BASE64_CHARS = 105_000_000;

/** Limite de tamanho em bytes para upload multipart (PDF binário, sem inflar em base64). */
const MAX_PDF_BYTES = 65 * 1024 * 1024;

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function clampDay(day: number, year: number, month0: number): number {
  const max = daysInMonth(year, month0);
  return Math.min(Math.max(1, day), max);
}

function normalizeParticipantName(name: string): string {
  return name
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

type ElegivelRow = {
  id: string;
  clientId: string;
  client: { name: string; phone: string };
};

/**
 * Correlaciona o nome devolvido pelo n8n com uma participante elegível.
 * Ordem: nome completo exato → cadastro começa com o texto do n8n + espaço → primeiro nome único.
 */
function matchElegivelByGanhadoraNome(
  ganhadoraNome: string,
  elegiveis: ElegivelRow[]
): { ok: true; winner: ElegivelRow } | { ok: false; code: string; error: string } {
  const target = normalizeParticipantName(ganhadoraNome);
  if (!target) {
    return { ok: false, code: 'N8N_WINNER_NAME_EMPTY', error: 'Nome da ganhadora vazio na resposta do n8n.' };
  }
  const norm = (e: ElegivelRow) => normalizeParticipantName(e.client.name);

  const exact = elegiveis.filter((e) => norm(e) === target);
  if (exact.length === 1) {
    return { ok: true, winner: exact[0]! };
  }
  if (exact.length > 1) {
    return {
      ok: false,
      code: 'WINNER_AMBIGUOUS',
      error:
        'Há mais de uma participante elegível com o mesmo nome completo. Ajuste os cadastros ou o retorno do n8n.',
    };
  }

  const byPrefix = elegiveis.filter((e) => {
    const n = norm(e);
    return n.startsWith(target + ' ');
  });
  if (byPrefix.length === 1) {
    return { ok: true, winner: byPrefix[0]! };
  }
  if (byPrefix.length > 1) {
    return {
      ok: false,
      code: 'WINNER_AMBIGUOUS',
      error:
        'O nome enviado pelo n8n coincide com o início de mais de uma participante. Envie o nome completo igual ao cadastro.',
    };
  }

  const byFirst = elegiveis.filter((e) => {
    const first = norm(e).split(' ')[0] ?? '';
    return first === target;
  });
  if (byFirst.length === 1) {
    return { ok: true, winner: byFirst[0]! };
  }
  if (byFirst.length > 1) {
    return {
      ok: false,
      code: 'WINNER_AMBIGUOUS',
      error:
        'Há mais de uma elegível com o mesmo primeiro nome. O n8n deve enviar o nome completo como está no cadastro.',
    };
  }

  return {
    ok: false,
    code: 'WINNER_NOT_IN_LIST',
    error:
      'O nome da ganhadora do n8n não bate com nenhuma elegível. Confira o cadastro ou devolva o nome completo (ex.: "Mirian Silva").',
  };
}

/** Normaliza JSON do banco para a UI (GET /consorcio). */
function drawAutomationFromDb(raw: unknown): ConsorcioN8nAutomationStored | undefined {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const atualizadoEm = typeof o.atualizadoEm === 'string' ? o.atualizadoEm : undefined;
  if (!atualizadoEm) return undefined;
  return {
    atualizadoEm,
    ...(typeof o.videoGenerated === 'boolean' && { videoGenerated: o.videoGenerated }),
    ...(typeof o.whatsappSent === 'boolean' && { whatsappSent: o.whatsappSent }),
    ...(typeof o.workflowSuccess === 'boolean' && { workflowSuccess: o.workflowSuccess }),
    ...(typeof o.detailMessage === 'string' && o.detailMessage && { detailMessage: o.detailMessage }),
  };
}

function selectedPdfIdsFromDb(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

/** Próxima data de sorteio (após “agora”) com base no dia do mês configurado */
export function computeNextDrawDate(drawDayOfMonth: number): Date {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = clampDay(drawDayOfMonth, y, m);
  let candidate = new Date(y, m, d, 23, 59, 59, 999);
  if (candidate <= now) {
    const nm = m === 11 ? 0 : m + 1;
    const ny = m === 11 ? y + 1 : y;
    const d2 = clampDay(drawDayOfMonth, ny, nm);
    candidate = new Date(ny, nm, d2, 12, 0, 0, 0);
  }
  return candidate;
}

async function ensureSettings(userId: string) {
  let s = await prisma.consorcioSettings.findUnique({ where: { userId } });
  if (!s) {
    s = await prisma.consorcioSettings.create({
      data: { userId },
    });
  }
  return s;
}

export async function getOverview(userId: string): Promise<
  ServiceResult<{
    settings: {
      cycleName: string;
      drawDayOfMonth: number;
      reminderDayOfMonth: number;
      reminderTime: string;
      selectedPdfIds: string[];
    };
    nextDrawDate: string;
    participants: Array<{
      id: string;
      clientId: string;
      name: string;
      phone: string;
      status: 'elegivel' | 'sorteada';
      joinedAt: string;
    }>;
    draws: Array<{
      id: string;
      date: string;
      winnerName: string;
      participantCount: number;
      triggeredBy: 'automatico' | 'manual';
      videoUrl: string | null;
      hasVideoPreview: boolean;
      whatsappDispatchPending: boolean;
      automation?: ConsorcioN8nAutomationStored;
    }>;
  }>
> {
  const settings = await ensureSettings(userId);
  const [participants, draws] = await Promise.all([
    prisma.consorcioParticipant.findMany({
      where: { userId },
      include: { client: true },
      orderBy: { joinedAt: 'desc' },
    }),
    prisma.consorcioDraw.findMany({
      where: { userId },
      orderBy: { drawnAt: 'desc' },
      take: 50,
    }),
  ]);

  const nextDrawDate = computeNextDrawDate(settings.drawDayOfMonth);

  return {
    data: {
      settings: {
        cycleName: settings.cycleName,
        drawDayOfMonth: settings.drawDayOfMonth,
        reminderDayOfMonth: settings.reminderDayOfMonth,
        reminderTime: settings.reminderTime,
        selectedPdfIds: selectedPdfIdsFromDb(settings.selectedPdfIds),
      },
      nextDrawDate: nextDrawDate.toISOString(),
      participants: participants.map((p) => ({
        id: p.id,
        clientId: p.clientId,
        name: p.client.name,
        phone: p.client.phone,
        status: p.status,
        joinedAt: p.joinedAt.toISOString().slice(0, 10),
      })),
      draws: draws.map((d) => {
        const automation = drawAutomationFromDb(d.n8nAutomation);
        const hasVideoPreview =
          Boolean(d.videoPreviewBase64 && d.videoPreviewBase64.length > 0) ||
          Boolean(d.videoUrl?.trim());
        return {
          id: d.id,
          date: d.drawnAt.toISOString().slice(0, 10),
          winnerName: d.winnerName,
          participantCount: d.participantCount,
          triggeredBy:
            d.triggeredBy === 'automatico' ? ('automatico' as const) : ('manual' as const),
          videoUrl: d.videoUrl,
          hasVideoPreview,
          whatsappDispatchPending: d.whatsappDispatchPending,
          ...(automation && { automation }),
        };
      }),
    },
  };
}

type PatchSettingsInput = {
  cycleName?: string;
  drawDayOfMonth?: number;
  reminderDayOfMonth?: number;
  reminderTime?: string;
  selectedPdfIds?: string[];
};

export async function patchSettings(
  userId: string,
  input: PatchSettingsInput
): Promise<ServiceResult<{ ok: true }>> {
  await ensureSettings(userId);
  const data: Record<string, unknown> = {};
  if (input.cycleName !== undefined) data.cycleName = input.cycleName.slice(0, 200);
  if (input.drawDayOfMonth !== undefined) {
    const d = input.drawDayOfMonth;
    if (d < 1 || d > 31) {
      return { error: 'Dia do sorteio inválido', code: 'VALIDATION_ERROR', statusCode: 400 };
    }
    data.drawDayOfMonth = d;
  }
  if (input.reminderDayOfMonth !== undefined) {
    const d = input.reminderDayOfMonth;
    if (d < 1 || d > 31) {
      return { error: 'Dia do lembrete inválido', code: 'VALIDATION_ERROR', statusCode: 400 };
    }
    data.reminderDayOfMonth = d;
  }
  if (input.reminderTime !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(input.reminderTime)) {
      return { error: 'Horário inválido', code: 'VALIDATION_ERROR', statusCode: 400 };
    }
    data.reminderTime = input.reminderTime;
  }
  if (input.selectedPdfIds !== undefined) {
    data.selectedPdfIds = Array.from(new Set(input.selectedPdfIds.filter(Boolean)));
  }
  if (Object.keys(data).length === 0) {
    return { data: { ok: true } };
  }
  await prisma.consorcioSettings.update({
    where: { userId },
    data,
  });
  return { data: { ok: true } };
}

export async function addParticipant(
  userId: string,
  clientId: string
): Promise<
  ServiceResult<{
    id: string;
    clientId: string;
    name: string;
    phone: string;
    status: 'elegivel' | 'sorteada';
    joinedAt: string;
  }>
> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
  });
  if (!client) {
    return { error: 'Cliente não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }
  try {
    const p = await prisma.consorcioParticipant.create({
      data: { userId, clientId },
      include: { client: true },
    });
    return {
      data: {
        id: p.id,
        clientId: p.clientId,
        name: p.client.name,
        phone: p.client.phone,
        status: p.status,
        joinedAt: p.joinedAt.toISOString().slice(0, 10),
      },
    };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'P2002') {
      return {
        error: 'Esta cliente já está no ciclo',
        code: 'DUPLICATE_PARTICIPANT',
        statusCode: 409,
      };
    }
    throw e;
  }
}

export async function removeParticipant(
  userId: string,
  participantId: string
): Promise<ServiceResult<{ ok: true }>> {
  const res = await prisma.consorcioParticipant.deleteMany({
    where: { id: participantId, userId },
  });
  if (res.count === 0) {
    return { error: 'Participante não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }
  return { data: { ok: true } };
}

export async function runDraw(
  userId: string,
  triggeredBy: 'manual' | 'automatico'
): Promise<
  ServiceResult<{
    winnerParticipantId: string;
    winnerName: string;
    participantCount: number;
    sorteioId: string;
    videoUrl?: string | null;
    hasVideoPreview: boolean;
    whatsappDispatchPending: boolean;
    n8nMessage?: string;
    automation?: ConsorcioN8nAutomationStored;
  }>
> {
  const elegiveis = await prisma.consorcioParticipant.findMany({
    where: { userId, status: 'elegivel' },
    include: { client: true },
  });
  if (elegiveis.length === 0) {
    return {
      error: 'Não há participantes elegíveis para o sorteio',
      code: 'NO_ELEGIVEIS',
      statusCode: 400,
    };
  }

  const webhookUrl = env.N8N_CONSORCIO_DRAW_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return {
      error:
        'Configure N8N_CONSORCIO_DRAW_WEBHOOK_URL no servidor. O sorteio e o vídeo são feitos pelo n8n.',
      code: 'N8N_WEBHOOK_REQUIRED',
      statusCode: 400,
    };
  }

  const total = await prisma.consorcioParticipant.count({ where: { userId } });
  const elegiveisAntesDoSorteio = elegiveis.length;
  const jaSorteadasAntesDoSorteio = total - elegiveisAntesDoSorteio;

  const [allRows, owner, settings] = await Promise.all([
    prisma.consorcioParticipant.findMany({
      where: { userId },
      include: { client: true },
      orderBy: { client: { name: 'asc' } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        businessName: true,
        businessPhone: true,
      },
    }),
    prisma.consorcioSettings.findUnique({ where: { userId } }),
  ]);
  const selectedPdfIds = selectedPdfIdsFromDb(settings?.selectedPdfIds);
  const selectedPdfs =
    selectedPdfIds.length > 0
      ? await prisma.consorcioPdf.findMany({
          where: { userId, id: { in: selectedPdfIds } },
          select: {
            id: true,
            title: true,
            fileName: true,
            mime: true,
            publicUrl: true,
            pdfBase64: true,
          },
        })
      : [];

  const participantesElegiveis = elegiveis.map((row) => ({
    participanteId: row.id,
    clienteId: row.clientId,
    nome: row.client.name,
    telefone: row.client.phone,
  }));

  const participantesTodas = allRows.map((row) => ({
    participanteId: row.id,
    clienteId: row.clientId,
    nome: row.client.name,
    telefone: row.client.phone,
    status: row.status as 'elegivel' | 'sorteada',
    elegivel: row.status === 'elegivel',
  }));

  const payload: ConsorcioDrawN8nSolicitacaoPayload = {
    evento: 'consorcio_sorteio_solicitacao',
    disparadoEm: new Date().toISOString(),
    disparadoPor: triggeredBy,
    salao: {
      usuarioId: userId,
      nomeUsuario: owner?.name ?? '',
      emailUsuario: owner?.email ?? null,
      nomeNegocio: owner?.businessName ?? null,
      telefoneNegocio: owner?.businessPhone ?? null,
    },
    ciclo: {
      nome: settings?.cycleName ?? 'Ciclo atual',
      diaSorteioNoMes: settings?.drawDayOfMonth ?? 10,
    },
    totais: {
      totalParticipantes: total,
      elegiveisAntesDoSorteio,
      jaSorteadasAntesDoSorteio,
    },
    participantesElegiveis,
    participantesTodas,
    revistasSelecionadas:
      selectedPdfs.length > 0
        ? selectedPdfs.map((pdf) => {
            const docName = (pdf.fileName?.trim() || pdf.title.trim()).slice(0, 255);
            const title = pdf.title.trim() || docName;
            const file = pdf.publicUrl?.trim() || null;
            const b64 = pdf.pdfBase64?.trim();
            return {
              pdfId: pdf.id,
              docName,
              file,
              text: `📘 ${title}`,
              mime: pdf.mime,
              ...(b64 && b64.length > 0 ? { pdfBase64: b64 } : {}),
            };
          })
        : undefined,
    saas: {
      appUrl: env.APP_URL?.trim() || null,
      apiPublicUrl: env.NEXT_PUBLIC_API_URL?.trim() || null,
    },
  };

  const n8n = await postConsorcioDrawSolicitacaoWebhook(webhookUrl, payload);
  if (!n8n.ok) {
    return {
      error: n8n.error,
      code: 'N8N_WEBHOOK_ERROR',
      statusCode: 502,
    };
  }

  const winnerNameRaw = n8n.winnerNameRaw?.trim();
  if (!winnerNameRaw) {
    return {
      error:
        'O n8n não retornou o nome da ganhadora. Inclua na resposta: ganhadoraNome (nome completo igual ao cadastro).',
      code: 'N8N_WINNER_NAME_MISSING',
      statusCode: 422,
    };
  }

  const matched = matchElegivelByGanhadoraNome(winnerNameRaw, elegiveis);
  if (!matched.ok) {
    return {
      error: matched.error,
      code: matched.code,
      statusCode: 422,
    };
  }
  const winner = matched.winner;

  let videoPreviewBase64: string | null = null;
  let videoPreviewMime: string | null = null;
  if (n8n.videoBase64) {
    if (n8n.videoBase64.length > MAX_VIDEO_PREVIEW_BASE64_CHARS) {
      return {
        error: `Vídeo em base64 excede o limite (${MAX_VIDEO_PREVIEW_BASE64_CHARS} caracteres). Use videoUrl ou reduza o arquivo.`,
        code: 'N8N_VIDEO_TOO_LARGE',
        statusCode: 422,
      };
    }
    videoPreviewBase64 = n8n.videoBase64;
    videoPreviewMime =
      n8n.videoMimeType?.trim() ||
      inferMediaMimeFromBase64(n8n.videoBase64) ||
      'video/mp4';
  }

  const sendWebhookConfigured = Boolean(env.N8N_CONSORCIO_SEND_WEBHOOK_URL?.trim());
  const hasVideoPreview =
    Boolean(videoPreviewBase64) || Boolean(n8n.videoUrlApplied?.trim());
  const whatsappDispatchPending = sendWebhookConfigured && hasVideoPreview;

  let drawId: string;
  try {
    drawId = await prisma.$transaction(async (tx) => {
      await tx.consorcioParticipant.update({
        where: { id: winner.id },
        data: { status: 'sorteada' },
      });
      const draw = await tx.consorcioDraw.create({
        data: {
          userId,
          winnerName: winner.client.name,
          winnerParticipantId: winner.id,
          participantCount: total,
          triggeredBy,
          videoUrl: n8n.videoUrlApplied?.trim() || null,
          videoPreviewBase64,
          videoPreviewMime,
          whatsappDispatchPending,
          ...(n8n.automation ? { n8nAutomation: n8n.automation } : {}),
        },
        select: { id: true },
      });
      return draw.id;
    });
  } catch (e) {
    const mapped = mapConsorcioDbError(e);
    if (mapped) {
      return {
        error: mapped.error,
        code: mapped.code,
        statusCode: mapped.statusCode,
      };
    }
    console.error('[consorcio] Erro ao gravar sorteio:', e);
    if (e instanceof Error && /Unknown argument/i.test(e.message)) {
      return {
        error:
          'O Prisma Client está desatualizado (o schema tem campos que o client gerado não conhece). Pare a API (Ctrl+C em todos os terminais com npm run dev), depois na raiz do monorepo: npm run db:generate. Em seguida suba a API de novo. Se o erro for coluna no Postgres: npm run db:migrate.',
        code: 'PRISMA_CLIENT_STALE',
        statusCode: 503,
      };
    }
    const hint =
      env.NODE_ENV === 'development' && e instanceof Error ? ` (${e.message})` : '';
    return {
      error: `Erro ao salvar o sorteio no banco.${hint} Rode migrations (consórcio) e confira os logs da API.`,
      code: 'DRAW_PERSIST_ERROR',
      statusCode: 500,
    };
  }

  return {
    data: {
      sorteioId: drawId,
      winnerParticipantId: winner.id,
      winnerName: winner.client.name,
      participantCount: total,
      videoUrl: n8n.videoUrlApplied?.trim() || null,
      hasVideoPreview,
      whatsappDispatchPending,
      ...(n8n.n8nMessage !== undefined && n8n.n8nMessage !== '' && { n8nMessage: n8n.n8nMessage }),
      ...(n8n.automation !== undefined && { automation: n8n.automation }),
    },
  };
}

export async function getDrawVideoPreview(
  userId: string,
  drawId: string
): Promise<ServiceResult<{ mime: string; base64: string }>> {
  const row = await prisma.consorcioDraw.findFirst({
    where: { id: drawId, userId },
    select: { videoPreviewBase64: true, videoPreviewMime: true },
  });
  if (!row?.videoPreviewBase64) {
    return { error: 'Preview em base64 não disponível', code: 'NOT_FOUND', statusCode: 404 };
  }
  const mime =
    row.videoPreviewMime?.trim() ||
    inferMediaMimeFromBase64(row.videoPreviewBase64) ||
    'application/octet-stream';
  return {
    data: {
      mime,
      base64: row.videoPreviewBase64,
    },
  };
}

/**
 * Última ganhadora registrada em `consorcio_draws` (mais recente por `drawnAt`), resolvida para participante/cliente.
 */
export async function getLastConsorcioDrawWinnerParticipant(userId: string): Promise<
  ServiceResult<{
    drawId: string;
    drawnAt: string;
    participantId: string;
    clientId: string;
    name: string;
    phone: string;
  } | null>
> {
  const draw = await prisma.consorcioDraw.findFirst({
    where: { userId },
    orderBy: { drawnAt: 'desc' },
    select: {
      id: true,
      drawnAt: true,
      winnerName: true,
      winnerParticipantId: true,
    },
  });
  if (!draw) {
    return { data: null };
  }

  let row =
    draw.winnerParticipantId != null
      ? await prisma.consorcioParticipant.findFirst({
          where: { id: draw.winnerParticipantId, userId },
          include: { client: true },
        })
      : null;
  if (!row?.client) {
    row = await prisma.consorcioParticipant.findFirst({
      where: {
        userId,
        status: 'sorteada',
        client: { name: draw.winnerName },
      },
      include: { client: true },
      orderBy: { joinedAt: 'desc' },
    });
  }
  if (!row?.client) {
    row = await prisma.consorcioParticipant.findFirst({
      where: {
        userId,
        client: { name: draw.winnerName },
      },
      include: { client: true },
      orderBy: { joinedAt: 'desc' },
    });
  }
  if (!row?.client) {
    return { data: null };
  }

  return {
    data: {
      drawId: draw.id,
      drawnAt: draw.drawnAt.toISOString(),
      participantId: row.id,
      clientId: row.clientId,
      name: row.client.name,
      phone: row.client.phone,
    },
  };
}

export async function sendDrawWhatsapp(
  userId: string,
  drawId: string,
  options?: { revistaPdfIds?: string[] }
): Promise<
  ServiceResult<{
    ok: true;
    n8nMessage?: string;
    automation?: ConsorcioN8nAutomationStored;
  }>
> {
  const sendUrl = env.N8N_CONSORCIO_SEND_WEBHOOK_URL?.trim();
  if (!sendUrl) {
    return {
      error: 'Configure N8N_CONSORCIO_SEND_WEBHOOK_URL no servidor.',
      code: 'N8N_SEND_WEBHOOK_REQUIRED',
      statusCode: 400,
    };
  }

  const draw = await prisma.consorcioDraw.findFirst({
    where: { id: drawId, userId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          businessName: true,
          businessPhone: true,
        },
      },
    },
  });
  if (!draw) {
    return { error: 'Sorteio não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }
  if (!draw.whatsappDispatchPending) {
    return {
      error: 'Não há envio pendente para este sorteio.',
      code: 'NOTHING_TO_SEND',
      statusCode: 400,
    };
  }

  let winnerRow =
    draw.winnerParticipantId != null
      ? await prisma.consorcioParticipant.findFirst({
          where: { id: draw.winnerParticipantId, userId },
          include: { client: true },
        })
      : null;
  if (!winnerRow) {
    winnerRow = await prisma.consorcioParticipant.findFirst({
      where: {
        userId,
        status: 'sorteada',
        client: { name: draw.winnerName },
      },
      include: { client: true },
      orderBy: { joinedAt: 'desc' },
    });
  }

  const ganhadoraTelefone = winnerRow?.client.phone ?? '';
  const ganhadoraParticipanteId = winnerRow?.id ?? draw.winnerParticipantId ?? '';
  const ganhadoraClienteId = winnerRow?.clientId ?? '';

  const settings = await prisma.consorcioSettings.findUnique({ where: { userId } });

  const revistaIds = Array.from(
    new Set((options?.revistaPdfIds ?? []).filter((id) => typeof id === 'string' && id.length > 0))
  );
  const revistaRows =
    revistaIds.length > 0
      ? await prisma.consorcioPdf.findMany({
          where: { userId, id: { in: revistaIds } },
          select: {
            id: true,
            title: true,
            fileName: true,
            mime: true,
            publicUrl: true,
            pdfBase64: true,
          },
        })
      : [];
  const pdfById = new Map(revistaRows.map((p) => [p.id, p]));
  const revistaPdfsOrdered = revistaIds
    .map((id) => pdfById.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null);

  const revistasParaEnviar =
    revistaPdfsOrdered.length > 0
      ? revistaPdfsOrdered.map((pdf) => {
          const docName = (pdf.fileName?.trim() || pdf.title.trim()).slice(0, 255);
          const title = pdf.title.trim() || docName;
          const file = pdf.publicUrl?.trim() || null;
          const b64 = pdf.pdfBase64?.trim();
          return {
            pdfId: pdf.id,
            docName,
            file,
            text: `📘 ${title}`,
            mime: pdf.mime,
            ...(b64 && b64.length > 0 ? { pdfBase64: b64 } : {}),
          };
        })
      : undefined;

  const payload: ConsorcioSendWhatsappPayload = {
    evento: 'consorcio_sorteio_enviar',
    disparadoEm: new Date().toISOString(),
    sorteioId: draw.id,
    salao: {
      usuarioId: userId,
      nomeUsuario: draw.user.name ?? '',
      emailUsuario: draw.user.email ?? null,
      nomeNegocio: draw.user.businessName ?? null,
      telefoneNegocio: draw.user.businessPhone ?? null,
    },
    ganhadora: {
      nome: draw.winnerName,
      telefone: ganhadoraTelefone,
      participanteId: ganhadoraParticipanteId,
      clienteId: ganhadoraClienteId,
    },
    ciclo: {
      nome: settings?.cycleName ?? 'Ciclo atual',
      diaSorteioNoMes: settings?.drawDayOfMonth ?? 10,
    },
    video: {
      videoUrl: draw.videoUrl,
      videoBase64: draw.videoPreviewBase64,
      videoMimeType: draw.videoPreviewMime,
    },
    ...(revistasParaEnviar ? { revistasParaEnviar } : {}),
  };

  const n8n = await postConsorcioSendWhatsappWebhook(sendUrl, payload);
  if (!n8n.ok) {
    return {
      error: n8n.error,
      code: 'N8N_SEND_WEBHOOK_ERROR',
      statusCode: 502,
    };
  }

  const prevAuto = drawAutomationFromDb(draw.n8nAutomation);
  const merged: ConsorcioN8nAutomationStored = {
    atualizadoEm: new Date().toISOString(),
    ...(prevAuto?.videoGenerated !== undefined && { videoGenerated: prevAuto.videoGenerated }),
    whatsappSent: true,
    workflowSuccess: n8n.automation?.workflowSuccess ?? true,
    detailMessage: n8n.automation?.detailMessage ?? n8n.n8nMessage ?? prevAuto?.detailMessage,
  };

  await prisma.consorcioDraw.updateMany({
    where: { id: drawId, userId },
    data: {
      whatsappDispatchPending: false,
      videoPreviewBase64: null,
      videoPreviewMime: null,
      n8nAutomation: merged,
    },
  });

  return {
    data: {
      ok: true,
      ...(n8n.n8nMessage !== undefined && n8n.n8nMessage !== '' && { n8nMessage: n8n.n8nMessage }),
      automation: merged,
    },
  };
}

export async function resetCycle(userId: string): Promise<ServiceResult<{ ok: true }>> {
  await prisma.$transaction([
    prisma.consorcioParticipant.deleteMany({ where: { userId } }),
    prisma.consorcioDraw.deleteMany({ where: { userId } }),
  ]);
  return { data: { ok: true } };
}

export async function patchDrawVideo(
  userId: string,
  drawId: string,
  videoUrl: string | null
): Promise<ServiceResult<{ ok: true }>> {
  const res = await prisma.consorcioDraw.updateMany({
    where: { id: drawId, userId },
    data: { videoUrl: videoUrl || null },
  });
  if (res.count === 0) {
    return { error: 'Sorteio não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }
  return { data: { ok: true } };
}

function normalizePdfBase64(input: string): string {
  const s = input.trim();
  const stripped = s.replace(
    /^data:application\/pdf;base64,/i,
    ''
  ).replace(/^data:application\/octet-stream;base64,/i, '');
  return stripped.replace(/\s/g, '');
}

function isPdfBase64LikelyValid(base64: string): boolean {
  try {
    const buf = Buffer.from(base64, 'base64');
    const head = buf.subarray(0, 5).toString('utf8');
    return head === '%PDF-';
  } catch {
    return false;
  }
}

export async function listConsorcioPdfs(
  userId: string
): Promise<
  ServiceResult<{
    pdfs: Array<{
      id: string;
      title: string;
      fileName: string | null;
      mime: string;
      publicUrl: string | null;
      createdAt: string;
    }>;
  }>
> {
  const rows = await prisma.consorcioPdf.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      fileName: true,
      mime: true,
      publicUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return {
    data: {
      pdfs: rows.map((r) => ({
        id: r.id,
        title: r.title,
        fileName: r.fileName,
        mime: r.mime,
        publicUrl: r.publicUrl,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  };
}

export async function uploadConsorcioPdf(
  userId: string,
  input: {
    title?: string;
    category?: string;
    monthRef?: string;
    fileName?: string | null;
    mime?: string | null;
    pdfBase64: string;
  }
): Promise<ServiceResult<{ id: string }>> {
  const pdfBase64 = normalizePdfBase64(input.pdfBase64);
  if (!pdfBase64 || pdfBase64.length < 50) {
    return { error: 'PDF base64 inválido', code: 'INVALID_PDF', statusCode: 422 };
  }
  if (pdfBase64.length > MAX_PDF_BASE64_CHARS) {
    return {
      error: `PDF excede o limite (${MAX_PDF_BASE64_CHARS} caracteres em base64)`,
      code: 'PDF_TOO_LARGE',
      statusCode: 422,
    };
  }
  if (!isPdfBase64LikelyValid(pdfBase64)) {
    return { error: 'Arquivo não parece ser um PDF válido', code: 'INVALID_PDF', statusCode: 422 };
  }

  const mime = (input.mime ?? 'application/pdf')?.trim() || 'application/pdf';
  if (mime !== 'application/pdf' && mime !== 'application/octet-stream') {
    return { error: 'mime inválido (esperado application/pdf)', code: 'INVALID_MIME', statusCode: 422 };
  }

  const defaultTitle = (input.fileName ?? 'revista.pdf')
    .toString()
    .replace(/\.[^.]+$/, '')
    .slice(0, 200);

  const title = (input.title ?? defaultTitle).trim().slice(0, 200);

  const webhookUrl = env.N8N_CONSORCIO_PDF_UPLOAD_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return {
      error:
        'Configure N8N_CONSORCIO_PDF_UPLOAD_WEBHOOK_URL no servidor. O upload de revistas é feito pelo n8n (MinIO) e só a URL pública é salva.',
      code: 'N8N_PDF_UPLOAD_WEBHOOK_REQUIRED',
      statusCode: 400,
    };
  }

  const n8n = await postConsorcioPdfUploadWebhook(webhookUrl, {
    evento: 'consorcio_revista_upload',
    usuarioId: userId,
    titulo: title,
    ...(input.category?.trim() ? { categoria: input.category.trim().slice(0, 100) } : {}),
    ...(input.monthRef?.trim() ? { mesReferencia: input.monthRef.trim().slice(0, 50) } : {}),
    nomeArquivo: input.fileName?.trim() ? String(input.fileName).trim() : null,
    mime,
    pdfBase64,
  });

  if (!n8n.ok) {
    return {
      error: n8n.error,
      code: 'N8N_PDF_UPLOAD_ERROR',
      statusCode: 502,
    };
  }

  const created = await prisma.consorcioPdf.create({
    data: {
      userId,
      title,
      fileName: input.fileName?.trim() ? String(input.fileName).trim() : null,
      mime,
      publicUrl: n8n.publicUrl,
      pdfBase64: null,
    },
    select: { id: true },
  });

  return { data: created };
}

function isPdfBufferLikelyValid(buf: Buffer): boolean {
  if (buf.length < 5) return false;
  const head = buf.subarray(0, 5).toString('ascii');
  return head.startsWith('%PDF');
}

/**
 * Upload de revista via buffer binário → n8n recebe multipart (campo `file`).
 * Evita JSON gigante com base64 (PDFs de dezenas de MB).
 */
export async function uploadConsorcioPdfFromBuffer(
  userId: string,
  input: {
    title?: string;
    category?: string;
    monthRef?: string;
    fileName?: string | null;
    mime?: string | null;
    pdfBuffer: Buffer;
  }
): Promise<ServiceResult<{ id: string }>> {
  const pdfBuffer = input.pdfBuffer;
  if (!pdfBuffer || pdfBuffer.length < 50) {
    return { error: 'PDF inválido ou vazio', code: 'INVALID_PDF', statusCode: 422 };
  }
  if (pdfBuffer.length > MAX_PDF_BYTES) {
    return {
      error: `PDF excede o limite de ${Math.floor(MAX_PDF_BYTES / (1024 * 1024))}MB`,
      code: 'PDF_TOO_LARGE',
      statusCode: 422,
    };
  }
  if (!isPdfBufferLikelyValid(pdfBuffer)) {
    return { error: 'Arquivo não parece ser um PDF válido', code: 'INVALID_PDF', statusCode: 422 };
  }

  const mime = (input.mime ?? 'application/pdf')?.trim() || 'application/pdf';
  if (mime !== 'application/pdf' && mime !== 'application/octet-stream') {
    return { error: 'mime inválido (esperado application/pdf)', code: 'INVALID_MIME', statusCode: 422 };
  }

  const defaultTitle = (input.fileName ?? 'revista.pdf')
    .toString()
    .replace(/\.[^.]+$/, '')
    .slice(0, 200);

  const title = (input.title ?? defaultTitle).trim().slice(0, 200);

  const webhookUrl = env.N8N_CONSORCIO_PDF_UPLOAD_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return {
      error:
        'Configure N8N_CONSORCIO_PDF_UPLOAD_WEBHOOK_URL no servidor. O upload de revistas é feito pelo n8n (MinIO) e só a URL pública é salva.',
      code: 'N8N_PDF_UPLOAD_WEBHOOK_REQUIRED',
      statusCode: 400,
    };
  }

  const n8n = await postConsorcioPdfUploadWebhookMultipart(webhookUrl, {
    usuarioId: userId,
    titulo: title,
    ...(input.category?.trim() ? { categoria: input.category.trim().slice(0, 100) } : {}),
    ...(input.monthRef?.trim() ? { mesReferencia: input.monthRef.trim().slice(0, 50) } : {}),
    nomeArquivo: input.fileName?.trim() ? String(input.fileName).trim() : null,
    mime,
    pdfBuffer,
  });

  if (!n8n.ok) {
    return {
      error: n8n.error,
      code: 'N8N_PDF_UPLOAD_ERROR',
      statusCode: 502,
    };
  }

  const created = await prisma.consorcioPdf.create({
    data: {
      userId,
      title,
      fileName: input.fileName?.trim() ? String(input.fileName).trim() : null,
      mime,
      publicUrl: n8n.publicUrl,
      pdfBase64: null,
    },
    select: { id: true },
  });

  return { data: created };
}

export async function deleteConsorcioPdf(
  userId: string,
  pdfId: string
): Promise<ServiceResult<{ ok: true }>> {
  const res = await prisma.consorcioPdf.deleteMany({
    where: { id: pdfId, userId },
  });
  if (res.count === 0) {
    return { error: 'PDF não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }
  return { data: { ok: true } };
}

export async function getConsorcioPdfDownload(
  userId: string,
  pdfId: string
): Promise<
  ServiceResult<{
    id: string;
    title: string;
    fileName: string | null;
    mime: string;
    publicUrl: string | null;
    pdfBase64: string | null;
  }>
> {
  const row = await prisma.consorcioPdf.findFirst({
    where: { id: pdfId, userId },
    select: {
      id: true,
      title: true,
      fileName: true,
      mime: true,
      publicUrl: true,
      pdfBase64: true,
    },
  });
  if (!row) {
    return { error: 'PDF não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }
  return { data: row };
}

export async function listConsorcioPdfSendHistory(
  userId: string
): Promise<
  ServiceResult<{
    rows: Array<{
      id: string;
      sentAt: string;
      revista: string;
      enviadaPara: string;
      status: 'pending' | 'sent' | 'failed';
    }>;
  }>
> {
  const msgs = await prisma.whatsAppMessage.findMany({
    where: {
      userId,
      type: 'custom',
      OR: [{ message: { startsWith: 'Revista:' } }, { message: { startsWith: 'Catálogo:' } }],
    },
    include: {
      client: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return {
    data: {
      rows: msgs.map((m) => {
        const text = (m.message ?? '').trim();
        const revista = text.includes(':') ? text.split(':').slice(1).join(':').trim() : text;
        return {
          id: m.id,
          sentAt: (m.sentAt ?? m.createdAt).toISOString(),
          revista: revista || 'Revista',
          enviadaPara: m.client?.name ?? m.phone,
          status: m.status,
        };
      }),
    },
  };
}

export async function sendConsorcioPdfToParticipant(
  userId: string,
  pdfId: string,
  participantId: string,
  caption?: string
): Promise<ServiceResult<{ ok: true }>> {
  const [pdf, participant, user] = await Promise.all([
    prisma.consorcioPdf.findFirst({ where: { id: pdfId, userId } }),
    prisma.consorcioParticipant.findFirst({
      where: { id: participantId, userId },
      include: { client: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { whatsappInstanceId: true },
    }),
  ]);

  if (!pdf) {
    return { error: 'PDF não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }
  if (!participant?.client) {
    return {
      error: 'Participante não encontrado',
      code: 'NOT_FOUND',
      statusCode: 404,
    };
  }

  const message = (caption ?? `Revista: ${pdf.title}`).trim().slice(0, 4096);
  const publicUrl = pdf.publicUrl?.trim();
  const b64 = pdf.pdfBase64?.trim();
  const mediaUrl =
    publicUrl && publicUrl.length > 0
      ? publicUrl
      : b64 && b64.length > 0
        ? `data:application/pdf;base64,${b64}`
        : null;
  if (!mediaUrl) {
    return {
      error: 'Revista sem URL pública nem arquivo legado. Refaça o upload.',
      code: 'PDF_NO_MEDIA',
      statusCode: 422,
    };
  }

  /** Mesmo webhook do envio “qualquer cliente”: ganhadora/participante não exigem uazapi. */
  const revistaN8nUrl = env.N8N_CONSORCIO_REVISTA_CLIENT_WEBHOOK_URL?.trim();
  if (revistaN8nUrl) {
    return sendConsorcioPdfToClientViaN8nWebhook(userId, pdfId, participant.clientId, caption);
  }

  const instanceId = user?.whatsappInstanceId;
  if (!instanceId) {
    return {
      error:
        'WhatsApp não configurado. Configure em Configurações > WhatsApp, ou defina N8N_CONSORCIO_REVISTA_CLIENT_WEBHOOK_URL para enviar revistas só pelo n8n.',
      code: 'WHATSAPP_NOT_CONFIGURED',
      statusCode: 400,
    };
  }

  const phone = participant.client.phone;

  if (isRedisEnabled) {
    try {
      await addWhatsAppJob({
        userId,
        instanceId,
        phone,
        message,
        type: 'custom',
        mediaUrl,
        caption: message,
        clientId: participant.clientId,
      });
      return { data: { ok: true } };
    } catch (err) {
      // Em dev, pode existir REDIS_URL mas o Redis não está rodando; fazemos fallback direto.
      console.warn('[consorcio] Falha ao enfileirar PDF (Redis). Enviando direto.', err);
    }
  }

  // Fallback dev/local: manda direto sem fila BullMQ.
  try {
    await whatsapp.sendMedia({ instanceId, phone, mediaUrl, caption: message });
    await prisma.whatsAppMessage.create({
      data: {
        userId,
        clientId: participant.clientId,
        phone,
        message,
        type: 'custom',
        status: 'sent',
        sentAt: new Date(),
      },
    });
    return { data: { ok: true } };
  } catch (err) {
    await prisma.whatsAppMessage.create({
      data: {
        userId,
        clientId: participant.clientId,
        phone,
        message,
        type: 'custom',
        status: 'failed',
      },
    });
    throw err;
  }
}

/** Envia revista para qualquer cliente (menu Clientes) via webhook n8n. */
export async function sendConsorcioPdfToClientViaN8nWebhook(
  userId: string,
  pdfId: string,
  clientId: string,
  caption?: string
): Promise<ServiceResult<{ ok: true }>> {
  const webhookUrl = env.N8N_CONSORCIO_REVISTA_CLIENT_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return {
      error:
        'Configure N8N_CONSORCIO_REVISTA_CLIENT_WEBHOOK_URL no servidor para enviar revistas a clientes do cadastro.',
      code: 'N8N_REVISTA_CLIENT_WEBHOOK_REQUIRED',
      statusCode: 400,
    };
  }

  const [pdf, client, owner] = await Promise.all([
    prisma.consorcioPdf.findFirst({ where: { id: pdfId, userId } }),
    prisma.client.findFirst({ where: { id: clientId, userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        businessName: true,
        businessPhone: true,
      },
    }),
  ]);

  if (!pdf) {
    return { error: 'PDF não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }
  if (!client) {
    return { error: 'Cliente não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  }

  const publicUrl = pdf.publicUrl?.trim();
  const b64 = pdf.pdfBase64?.trim();
  const legenda = (caption ?? `Revista: ${pdf.title}`).trim().slice(0, 4096);

  if (!publicUrl && !(b64 && b64.length > 0)) {
    return {
      error: 'Revista sem URL pública nem arquivo legado. Refaça o upload.',
      code: 'PDF_NO_MEDIA',
      statusCode: 422,
    };
  }

  const n8n = await postConsorcioRevistaClienteWebhook(webhookUrl, {
    evento: 'consorcio_revista_enviar_cliente',
    disparadoEm: new Date().toISOString(),
    usuarioId: userId,
    salao: {
      nomeUsuario: owner?.name ?? '',
      emailUsuario: owner?.email ?? null,
      nomeNegocio: owner?.businessName ?? null,
      telefoneNegocio: owner?.businessPhone ?? null,
    },
    cliente: {
      clienteId: client.id,
      nome: client.name,
      telefone: client.phone,
    },
    pdf: {
      pdfId: pdf.id,
      titulo: pdf.title,
      nomeArquivo: pdf.fileName?.trim() ?? null,
      file: publicUrl && publicUrl.length > 0 ? publicUrl : null,
      mime: pdf.mime,
      ...(b64 && b64.length > 0 ? { pdfBase64: b64 } : {}),
    },
    legenda,
  });

  if (!n8n.ok) {
    return {
      error: n8n.error,
      code: 'N8N_REVISTA_CLIENT_WEBHOOK_ERROR',
      statusCode: 502,
    };
  }

  await prisma.whatsAppMessage.create({
    data: {
      userId,
      clientId: client.id,
      phone: client.phone,
      message: legenda,
      type: 'custom',
      status: 'sent',
      sentAt: new Date(),
    },
  });

  return { data: { ok: true } };
}
