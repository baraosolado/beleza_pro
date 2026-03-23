import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { mapConsorcioDbError } from '../lib/consorcio-db-errors.js';
import { replyError } from '../lib/errors.js';
import * as consorcioService from '../services/consorcio.service.js';

function failConsorcioDb(reply: FastifyReply, err: unknown): FastifyReply {
  const mapped = mapConsorcioDbError(err);
  if (mapped) return replyError(reply, mapped.statusCode, mapped.error, mapped.code);
  throw err;
}

const addParticipantSchema = z.object({
  clientId: z.string().uuid('ID do cliente inválido'),
});

const patchSettingsSchema = z
  .object({
    cycleName: z.string().min(1).max(200).optional(),
    drawDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
    reminderDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
    reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    selectedPdfIds: z.array(z.string().uuid('PDF inválido')).optional(),
  })
  .strict();

const runDrawSchema = z.object({
  triggeredBy: z.enum(['manual', 'automatico']).optional(),
});

const sendDrawWhatsappSchema = z
  .object({
    revistaPdfIds: z.array(z.string().uuid('ID de revista inválido')).max(50).optional(),
  })
  .strict();

const patchVideoSchema = z.object({
  videoUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
});

const uploadPdfSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    category: z.string().min(1).max(100).optional(),
    monthRef: z.string().min(1).max(50).optional(),
    fileName: z.string().max(255).optional().nullable(),
    mime: z.string().max(50).optional().nullable(),
    pdfBase64: z.string().min(50).optional(),
  })
  .strict();

const sendPdfSchema = z
  .object({
    participantId: z.string().uuid('Participante inválido'),
    caption: z.string().min(1).max(2000).optional(),
  })
  .strict();

const sendPdfToClientWebhookSchema = z
  .object({
    clientId: z.string().uuid('Cliente inválido'),
    caption: z.string().min(1).max(2000).optional(),
  })
  .strict();

export async function getOverview(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const result = await consorcioService.getOverview(request.userId);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function patchSettings(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = patchSettingsSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  try {
    const result = await consorcioService.patchSettings(request.userId, parsed.data);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function addParticipant(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = addParticipantSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  try {
    const result = await consorcioService.addParticipant(request.userId, parsed.data.clientId);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.status(201).send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function removeParticipant(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const result = await consorcioService.removeParticipant(request.userId, request.params.id);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.status(204).send();
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function runDraw(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = runDrawSchema.safeParse(request.body ?? {});
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const triggeredBy = parsed.data.triggeredBy ?? 'manual';
  try {
    const result = await consorcioService.runDraw(request.userId, triggeredBy);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function getDrawVideoPreview(
  request: FastifyRequest<{ Params: { drawId: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const result = await consorcioService.getDrawVideoPreview(
      request.userId,
      request.params.drawId
    );
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function sendDrawWhatsapp(
  request: FastifyRequest<{ Params: { drawId: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = sendDrawWhatsappSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }
  try {
    const result = await consorcioService.sendDrawWhatsapp(
      request.userId,
      request.params.drawId,
      { revistaPdfIds: parsed.data.revistaPdfIds }
    );
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function resetCycle(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const result = await consorcioService.resetCycle(request.userId);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function patchDrawVideo(
  request: FastifyRequest<{ Params: { drawId: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = patchVideoSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const raw = parsed.data.videoUrl;
  const videoUrl = raw === '' ? null : raw ?? null;
  try {
    const result = await consorcioService.patchDrawVideo(
      request.userId,
      request.params.drawId,
      videoUrl
    );
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function listPdfs(request: FastifyRequest, reply: FastifyReply) {
  try {
    const result = await consorcioService.listConsorcioPdfs(request.userId);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function uploadPdf(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const contentType = String(request.headers['content-type'] ?? '');

  if (contentType.includes('multipart/form-data')) {
    try {
      let fileBuffer: Buffer | null = null;
      let uploadFileName = 'revista.pdf';
      let uploadMime = 'application/pdf';
      const fields: Record<string, string> = {};

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname !== 'file') {
            await part.toBuffer().catch(() => undefined);
            continue;
          }
          fileBuffer = await part.toBuffer();
          if (part.filename) uploadFileName = part.filename;
          if (part.mimetype) uploadMime = part.mimetype;
        } else {
          fields[part.fieldname] = String(part.value ?? '').trim();
        }
      }

      if (!fileBuffer) {
        return replyError(
          reply,
          422,
          'Envie o PDF no campo de formulário "file" (multipart/form-data).',
          'VALIDATION_ERROR'
        );
      }

      const title = fields.title?.length ? fields.title.slice(0, 200) : undefined;
      const category = fields.category?.length ? fields.category.slice(0, 100) : undefined;
      const monthRef = fields.monthRef?.length ? fields.monthRef.slice(0, 50) : undefined;
      const fileName = fields.fileName?.length ? fields.fileName.slice(0, 255) : uploadFileName;
      const mime = fields.mime?.length ? fields.mime.slice(0, 50) : uploadMime;

      const result = await consorcioService.uploadConsorcioPdfFromBuffer(request.userId, {
        title,
        category,
        monthRef,
        fileName,
        mime,
        pdfBuffer: fileBuffer,
      });
      if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
      return reply.status(201).send(result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('file is too large') || msg.includes('maxFileSize')) {
        return replyError(reply, 413, 'PDF muito grande (máx. 65MB).', 'PDF_TOO_LARGE');
      }
      request.log.warn({ err }, 'uploadPdf multipart');
      return replyError(reply, 400, 'Falha ao processar upload multipart.', 'MULTIPART_ERROR');
    }
  }

  const parsed = uploadPdfSchema.safeParse(request.body);
  if (!parsed.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }
  const body = parsed.data;
  const pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : '';
  if (!pdfBase64) {
    return replyError(reply, 422, 'pdfBase64 é obrigatório', 'VALIDATION_ERROR');
  }
  try {
    const result = await consorcioService.uploadConsorcioPdf(request.userId, {
      title: body.title,
      category: body.category,
      monthRef: body.monthRef,
      fileName: body.fileName ?? null,
      mime: body.mime ?? null,
      pdfBase64,
    });
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.status(201).send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function deletePdf(
  request: FastifyRequest<{ Params: { pdfId: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const result = await consorcioService.deleteConsorcioPdf(request.userId, request.params.pdfId);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.status(204).send();
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function sendPdfToParticipant(
  request: FastifyRequest<{ Params: { pdfId: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = sendPdfSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  try {
    const result = await consorcioService.sendConsorcioPdfToParticipant(
      request.userId,
      request.params.pdfId,
      parsed.data.participantId,
      parsed.data.caption
    );
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function getLastDrawWinner(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const result = await consorcioService.getLastConsorcioDrawWinnerParticipant(request.userId);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function sendPdfToClientWebhook(
  request: FastifyRequest<{ Params: { pdfId: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = sendPdfToClientWebhookSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  try {
    const result = await consorcioService.sendConsorcioPdfToClientViaN8nWebhook(
      request.userId,
      request.params.pdfId,
      parsed.data.clientId,
      parsed.data.caption
    );
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function downloadPdf(
  request: FastifyRequest<{ Params: { pdfId: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const result = await consorcioService.getConsorcioPdfDownload(request.userId, request.params.pdfId);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}

export async function listPdfSendHistory(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const result = await consorcioService.listConsorcioPdfSendHistory(request.userId);
    if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
    return reply.send(result.data);
  } catch (err) {
    return failConsorcioDb(reply, err);
  }
}
