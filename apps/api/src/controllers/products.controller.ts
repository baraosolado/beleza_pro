import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { replyError } from '../lib/errors.js';
import * as productsService from '../services/products.service.js';

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const listSchema = z.object({
  search: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().positive('Preço deve ser maior que zero'),
  costPrice: z.number().nonnegative().nullable().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockAlert: z.boolean().optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  sku: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().positive('Preço deve ser maior que zero').optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockAlert: z.boolean().optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  sku: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsedParams = idParamSchema.safeParse(request.params);
  if (!parsedParams.success) {
    return replyError(reply, 400, 'Parâmetros inválidos', 'VALIDATION_ERROR');
  }

  const result = await productsService.getById(request.userId, parsedParams.data.id);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function list(
  request: FastifyRequest<{ Querystring: { search?: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = listSchema.safeParse(request.query);
  if (!parsed.success) {
    return replyError(reply, 400, 'Parâmetros inválidos', 'VALIDATION_ERROR');
  }
  const result = await productsService.list(request.userId, parsed.data);
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
  const result = await productsService.create(request.userId, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.status(201).send(result.data);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsedParams = idParamSchema.safeParse(request.params);
  if (!parsedParams.success) {
    return replyError(reply, 400, 'Parâmetros inválidos', 'VALIDATION_ERROR');
  }

  const parsedBody = updateSchema.safeParse(request.body);
  if (!parsedBody.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }

  const result = await productsService.update(
    request.userId,
    parsedParams.data.id,
    parsedBody.data
  );
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

