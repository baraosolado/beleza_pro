import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { replyError } from '../lib/errors.js';
import * as productCategoriesService from '../services/productCategories.service.js';

const createSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export async function list(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await productCategoriesService.list(request.userId);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = createSchema.safeParse(request.body);
  if (!parsed.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }
  const result = await productCategoriesService.create(request.userId, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.status(201).send(result.data);
}

