import argon2 from 'argon2';

import { prisma } from '../db/prisma/client.js';

import * as uazapi from '../integrations/uazapi.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

type UpdateInput = {
  name?: string;
  phone?: string;
  businessName?: string;
  businessCategory?: string;
  businessInstagram?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessPixKey?: string;
  businessAddress?: string;
  workingHours?: Record<string, unknown>;
};

export async function get(
  userId: string
): Promise<
  ServiceResult<{
    name: string;
    email: string;
    phone: string | null;
    plan: string;
    businessName: string | null;
    businessCategory: string | null;
    businessInstagram: string | null;
    businessEmail: string | null;
    businessPhone: string | null;
    businessPixKey: string | null;
    businessAddress: string | null;
    workingHours: unknown;
    createdAt: string;
  }>
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      phone: true,
      plan: true,
      businessName: true,
      businessCategory: true,
      businessInstagram: true,
      businessEmail: true,
      businessPhone: true,
      businessPixKey: true,
      businessAddress: true,
      workingHours: true,
      createdAt: true,
    },
  });
  if (!user) return { error: 'Usuário não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  return {
    data: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      plan: user.plan,
      businessName: user.businessName,
      businessCategory: user.businessCategory,
      businessInstagram: user.businessInstagram,
      businessEmail: user.businessEmail,
      businessPhone: user.businessPhone,
      businessPixKey: user.businessPixKey,
      businessAddress: user.businessAddress,
      workingHours: user.workingHours,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

export async function update(
  userId: string,
  input: UpdateInput
): Promise<ServiceResult<unknown>> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.businessName !== undefined && { businessName: input.businessName }),
      ...(input.businessCategory !== undefined && { businessCategory: input.businessCategory || null }),
      ...(input.businessInstagram !== undefined && { businessInstagram: input.businessInstagram || null }),
      ...(input.businessEmail !== undefined && { businessEmail: input.businessEmail || null }),
      ...(input.businessPhone !== undefined && { businessPhone: input.businessPhone || null }),
      ...(input.businessPixKey !== undefined && { businessPixKey: input.businessPixKey || null }),
      ...(input.businessAddress !== undefined && { businessAddress: input.businessAddress || null }),
      ...(input.workingHours !== undefined && { workingHours: input.workingHours as object }),
    },
    select: {
      name: true,
      email: true,
      phone: true,
      plan: true,
      businessName: true,
      businessCategory: true,
      businessInstagram: true,
      businessEmail: true,
      businessPhone: true,
      businessPixKey: true,
      businessAddress: true,
      workingHours: true,
    },
  });
  return { data: user };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<ServiceResult<{ message: string }>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { error: 'Usuário não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) {
    return { error: 'Senha atual incorreta', code: 'INVALID_PASSWORD', statusCode: 400 };
  }
  const passwordHash = await argon2.hash(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
  return { data: { message: 'Senha alterada com sucesso.' } };
}

export async function getWhatsappQrcode(
  userId: string
): Promise<ServiceResult<{ qrcode: string | null; connected: boolean }>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { whatsappInstanceId: true },
  });
  if (!user) return { error: 'Usuário não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  if (!user.whatsappInstanceId) {
    return { data: { qrcode: null, connected: false } };
  }
  if (!uazapi.isConfigured()) {
    return { data: { qrcode: null, connected: false } };
  }
  try {
    const result = await uazapi.getConnectQr(user.whatsappInstanceId) as { base64?: string };
    return { data: { qrcode: result?.base64 ?? null, connected: false } };
  } catch {
    return { data: { qrcode: null, connected: false } };
  }
}

export async function connectWhatsapp(
  userId: string
): Promise<ServiceResult<{ instanceId: string }>> {
  const instanceId = `user-${userId}`;
  if (!uazapi.isConfigured()) {
    return { error: 'WhatsApp não configurado', code: 'UAZAPI_NOT_CONFIGURED', statusCode: 503 };
  }
  try {
    await uazapi.createInstance(instanceId);
  } catch {
    // instance may already exist
  }
  await prisma.user.update({
    where: { id: userId },
    data: { whatsappInstanceId: instanceId },
  });
  return { data: { instanceId } };
}
