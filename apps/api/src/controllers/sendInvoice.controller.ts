import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { replyError } from '../lib/errors.js';
import * as sendInvoiceService from '../services/sendInvoice.service.js';

const previewSchema = z.object({
  clientId: z.string().uuid(),
  chargeIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma cobrança'),
});

const sendSchema = z.object({
  clientId: z.string().uuid(),
  chargeIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma cobrança'),
});

export async function preview(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = previewSchema.safeParse(request.body);
  if (!parsed.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }
  const { clientId, chargeIds } = parsed.data;
  request.log.info(
    { clientId, chargeCount: chargeIds.length },
    '[send-invoice] POST /preview chamado'
  );
  const result = await sendInvoiceService.requestPreview(
    request.userId,
    clientId,
    chargeIds
  );
  if (result.error) {
    return replyError(reply, result.statusCode, result.error, result.code);
  }
  return reply.send(result.data);
}

export async function send(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = sendSchema.safeParse(request.body);
  if (!parsed.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }
  const { clientId, chargeIds } = parsed.data;
  const result = await sendInvoiceService.requestSend(
    request.userId,
    clientId,
    chargeIds
  );
  if (result.error) {
    return replyError(reply, result.statusCode, result.error, result.code);
  }
  return reply.send(result.data);
}
