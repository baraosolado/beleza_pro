import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { replyError } from '../lib/errors.js';
import * as servicesService from '../services/services.service.js';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  durationMin: z.number().int().min(1).default(60),
  price: z.number().min(0),
  active: z.boolean().optional().default(true),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
});

export async function list(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) return replyError(reply, 400, 'Parâmetros inválidos', 'VALIDATION_ERROR');
  const result = await servicesService.list(request.userId, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = createSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const result = await servicesService.create(request.userId, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.status(201).send(result.data);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const result = await servicesService.update(request.userId, request.params.id, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await servicesService.remove(request.userId, request.params.id);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.status(204).send();
}
