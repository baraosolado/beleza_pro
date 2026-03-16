import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { replyError } from '../lib/errors.js';
import * as clientsService from '../services/clients.service.js';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(20),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  status: z.enum(['all', 'active', 'new']).optional(),
});

export async function list(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) return replyError(reply, 400, 'Parâmetros inválidos', 'VALIDATION_ERROR');
  const result = await clientsService.list(request.userId, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = createSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const result = await clientsService.create(request.userId, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.status(201).send(result.data);
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await clientsService.getById(request.userId, request.params.id);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const result = await clientsService.update(request.userId, request.params.id, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await clientsService.remove(request.userId, request.params.id);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.status(204).send();
}

export async function getAppointments(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await clientsService.getAppointments(request.userId, request.params.id);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}
