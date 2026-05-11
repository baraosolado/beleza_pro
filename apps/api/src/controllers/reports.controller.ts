import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { replyError } from '../lib/errors.js';
import * as reportsService from '../services/reports.service.js';

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  compare: z.enum(['previous']).optional(),
});

export async function full(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) {
    return replyError(reply, 400, 'Parâmetros inválidos', 'VALIDATION_ERROR');
  }
  const result = await reportsService.getFullReport(request.userId, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}
