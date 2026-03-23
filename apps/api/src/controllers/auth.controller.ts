import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import { replyError } from '../lib/errors.js';
import * as authService from '../services/auth.service.js';

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function register(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }
  const result = await authService.register(parsed.data);
  if (result.error) {
    return replyError(reply, result.statusCode, result.error, result.code);
  }
  const user = result.data!.user;
  try {
    const accessToken = await request.server.jwt.sign(
      { sub: user.id, plan: user.plan },
      { expiresIn: env.JWT_EXPIRES_IN }
    );
    const refreshToken = await authService.createRefreshToken(user.id);
    return reply.status(201).send({
      user: result.data!.user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    request.log.error({ err }, 'auth.register token');
    const msg =
      env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'Erro ao emitir sessão. Verifique JWT_SECRET e JWT_REFRESH_SECRET.';
    return replyError(reply, 500, msg, 'TOKEN_ISSUE');
  }
}

export async function login(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }
  const result = await authService.login(parsed.data);
  if (result.error) {
    return replyError(reply, result.statusCode, result.error, result.code);
  }
  const data = result.data!;
  try {
    const accessToken = await request.server.jwt.sign(
      { sub: data.user.id, plan: data.user.plan },
      { expiresIn: env.JWT_EXPIRES_IN }
    );
    const refreshToken = await authService.createRefreshToken(data.user.id);
    return reply.send({
      user: data.user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    request.log.error({ err }, 'auth.login token');
    const msg =
      env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'Erro ao emitir sessão. Verifique JWT_SECRET e JWT_REFRESH_SECRET.';
    return replyError(reply, 500, msg, 'TOKEN_ISSUE');
  }
}

export async function refresh(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = refreshSchema.safeParse(request.body);
  if (!parsed.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }
  const result = await authService.refresh(parsed.data.refreshToken);
  if (result.error) {
    return replyError(reply, result.statusCode, result.error, result.code);
  }
  const data = result.data!;
  try {
    const accessToken = await request.server.jwt.sign(
      { sub: data.userId, plan: data.plan },
      { expiresIn: env.JWT_EXPIRES_IN }
    );
    const newRefreshToken = await authService.createRefreshToken(data.userId);
    return reply.send({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    request.log.error({ err }, 'auth.refresh token');
    const msg =
      env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'Erro ao emitir sessão. Verifique JWT_SECRET e JWT_REFRESH_SECRET.';
    return replyError(reply, 500, msg, 'TOKEN_ISSUE');
  }
}

export async function forgotPassword(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = forgotPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }
  const result = await authService.forgotPassword(parsed.data.email);
  if (result.error) {
    return replyError(reply, result.statusCode, result.error, result.code);
  }
  return reply.send(result.data!);
}

export async function resetPassword(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = resetPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    return replyError(reply, 400, 'Dados inválidos', 'VALIDATION_ERROR');
  }
  const result = await authService.resetPassword(parsed.data);
  if (result.error) {
    return replyError(reply, result.statusCode, result.error, result.code);
  }
  return reply.send(result.data!);
}
