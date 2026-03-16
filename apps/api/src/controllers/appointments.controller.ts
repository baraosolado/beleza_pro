import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { replyError } from '../lib/errors.js';
import * as appointmentsService from '../services/appointments.service.js';

const createSchema = z.object({
  clientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  scheduledAt: z.string().datetime().or(z.coerce.date()),
  notes: z.string().optional(),
  sendConfirmation: z.boolean().optional().default(false),
});

const updateSchema = createSchema.partial().omit({ sendConfirmation: true });
const statusSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']),
});

const listQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  week: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export async function list(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) return replyError(reply, 400, 'Parâmetros inválidos', 'VALIDATION_ERROR');
  const result = await appointmentsService.list(request.userId, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = createSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const scheduledAt =
    parsed.data.scheduledAt instanceof Date
      ? parsed.data.scheduledAt
      : new Date(parsed.data.scheduledAt);
  const result = await appointmentsService.create(request.userId, {
    clientId: parsed.data.clientId,
    serviceId: parsed.data.serviceId,
    scheduledAt,
    notes: parsed.data.notes,
    sendConfirmation: parsed.data.sendConfirmation,
  });
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.status(201).send(result.data);
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await appointmentsService.getById(request.userId, request.params.id);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const data = parsed.data.scheduledAt
    ? { ...parsed.data, scheduledAt: parsed.data.scheduledAt instanceof Date ? parsed.data.scheduledAt : new Date(parsed.data.scheduledAt) }
    : parsed.data;
  const result = await appointmentsService.update(request.userId, request.params.id, data as Partial<{ clientId: string; serviceId: string; scheduledAt: Date; notes: string }>);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function updateStatus(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = statusSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const result = await appointmentsService.updateStatus(request.userId, request.params.id, parsed.data.status);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await appointmentsService.remove(request.userId, request.params.id);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.status(204).send();
}
