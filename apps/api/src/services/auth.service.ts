import * as crypto from 'node:crypto';
import * as jose from 'jose';

import argon2 from 'argon2';
import { Prisma } from '@prisma/client';

import { env } from '../config/env.js';
import { prisma } from '../db/prisma/client.js';

type RegisterInput = { name: string; email: string; password: string };
type LoginInput = { email: string; password: string };
type ResetPasswordInput = { token: string; password: string };

type UserPayload = { id: string; email: string; name: string; plan: string };

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

const TRIAL_DAYS = 14;

/** E-mails são únicos sem diferenciar maiúsculas (evita login falhar com Josefata@ vs josefata@). */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function register(
  input: RegisterInput
): Promise<ServiceResult<{ user: UserPayload }>> {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: 'E-mail já cadastrado', code: 'EMAIL_IN_USE', statusCode: 409 };
  }
  const passwordHash = await argon2.hash(input.password);
  const planExpiresAt = new Date();
  planExpiresAt.setDate(planExpiresAt.getDate() + TRIAL_DAYS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
      plan: 'trial',
      planExpiresAt,
    },
  });
  return {
    data: { user: { id: user.id, email: user.email, name: user.name, plan: user.plan } },
  };
}

export async function login(input: LoginInput): Promise<ServiceResult<{ user: UserPayload }>> {
  try {
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { error: 'E-mail ou senha inválidos', code: 'INVALID_CREDENTIALS', statusCode: 401 };
    }

    let valid = false;
    try {
      valid = await argon2.verify(user.passwordHash, input.password);
    } catch {
      // Hash inválido, formato antigo (ex.: bcrypt) ou corrompido — não expor detalhe ao cliente
      valid = false;
    }

    if (!valid) {
      return { error: 'E-mail ou senha inválidos', code: 'INVALID_CREDENTIALS', statusCode: 401 };
    }

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: String(user.plan),
        },
      },
    };
  } catch (err) {
    console.error('[auth.service.login]', err);

    const isDev = env.NODE_ENV === 'development';
    let message =
      'Serviço indisponível. Verifique o banco de dados e tente novamente.';

    if (isDev) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        message = `Banco de dados [${err.code}]: ${err.message}`;
      } else if (err instanceof Prisma.PrismaClientInitializationError) {
        message = `Prisma não conectou: ${err.message}`;
      } else if (err instanceof Error) {
        message = `Erro no login: ${err.message}`;
      }
    }

    return {
      error: message,
      code: 'LOGIN_UNAVAILABLE',
      statusCode: 503,
    };
  }
}

export async function createRefreshToken(userId: string): Promise<string> {
  try {
    const secret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
    return await new jose.SignJWT({ sub: userId, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
      .sign(secret);
  } catch (err) {
    console.error('[auth.service.createRefreshToken]', err);
    throw new Error('Falha ao gerar refresh token (JWT_REFRESH_SECRET / JWT_REFRESH_EXPIRES_IN)');
  }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string } | null> {
  try {
    const secret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    if (payload.type !== 'refresh' || typeof payload.sub !== 'string') return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export async function refresh(
  refreshToken: string
): Promise<ServiceResult<{ userId: string; plan: string }>> {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return { error: 'Token inválido ou expirado', code: 'INVALID_REFRESH_TOKEN', statusCode: 401 };
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    return { error: 'Usuário não encontrado', code: 'USER_NOT_FOUND', statusCode: 401 };
  }
  return { data: { userId: user.id, plan: user.plan } };
}

export async function forgotPassword(email: string): Promise<ServiceResult<{ message: string }>> {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const message = 'Se o e-mail existir, você receberá um link para redefinir a senha.';
  if (!user) {
    return { data: { message } };
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  await prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordToken: token, resetPasswordExpiresAt: expiresAt },
  });
  await prisma.notificationsLog.create({
    data: {
      userId: user.id,
      type: 'password_reset',
      payload: { email: user.email, token, expiresAt: expiresAt.toISOString() },
    },
  });
  return { data: { message } };
}

export async function resetPassword(
  input: ResetPasswordInput
): Promise<ServiceResult<{ message: string }>> {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: input.token,
      resetPasswordExpiresAt: { gt: new Date() },
    },
  });
  if (!user) {
    return { error: 'Token inválido ou expirado', code: 'INVALID_RESET_TOKEN', statusCode: 400 };
  }
  const passwordHash = await argon2.hash(input.password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    },
  });
  return { data: { message: 'Senha redefinida com sucesso.' } };
}
