import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { replyError } from '../lib/errors.js';
import * as chargesService from '../services/charges.service.js';

const createSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  amount: z.number().min(0),
  description: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.coerce.date()),
  /** Clientes podem enviar "" — tratar como ausente. */
  productId: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((v) => (v && v !== '' ? v : undefined)),
});

const updateSchema = z.object({
  amount: z.number().min(0).optional(),
  description: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.coerce.date()).optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export async function list(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) return replyError(reply, 400, 'Parâmetros inválidos', 'VALIDATION_ERROR');
  const result = await chargesService.list(request.userId, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = createSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const dueDate =
    typeof parsed.data.dueDate === 'string'
      ? new Date(`${parsed.data.dueDate}T00:00:00`)
      : parsed.data.dueDate;
  const result = await chargesService.create(request.userId, { ...parsed.data, dueDate });
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.status(201).send(result.data);
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await chargesService.getById(request.userId, request.params.id);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');

  const dueDate =
    parsed.data.dueDate && typeof parsed.data.dueDate === 'string'
      ? new Date(`${parsed.data.dueDate}T00:00:00`)
      : (parsed.data.dueDate as Date | undefined);

  const result = await chargesService.update(request.userId, request.params.id, {
    amount: parsed.data.amount,
    description: parsed.data.description,
    status: parsed.data.status,
    ...(dueDate && { dueDate }),
  });
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await chargesService.remove(request.userId, request.params.id);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.status(204).send();
}
