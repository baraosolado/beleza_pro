import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { replyError } from '../lib/errors.js';
import * as settingsService from '../services/settings.service.js';

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(20).optional(),
  businessName: z.string().max(255).optional(),
  businessCategory: z.string().max(100).optional(),
  businessInstagram: z.string().max(100).optional(),
  businessEmail: z.string().email().max(255).optional().or(z.literal('')),
  businessPhone: z.string().max(20).optional(),
  businessPixKey: z.string().max(255).optional(),
  businessAddress: z.string().max(1000).optional(),
  workingHours: z.record(z.string(), z.unknown()).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword: z.string().min(8, 'Nova senha com no mínimo 8 caracteres'),
});

export async function get(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await settingsService.get(request.userId);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function update(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const result = await settingsService.update(request.userId, parsed.data);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function changePassword(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = changePasswordSchema.safeParse(request.body);
  if (!parsed.success) return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  const result = await settingsService.changePassword(
    request.userId,
    parsed.data.currentPassword,
    parsed.data.newPassword
  );
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function getWhatsappQrcode(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await settingsService.getWhatsappQrcode(request.userId);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function connectWhatsapp(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await settingsService.connectWhatsapp(request.userId);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}
