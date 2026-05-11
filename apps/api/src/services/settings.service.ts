import argon2 from 'argon2';

import { prisma } from '../db/prisma/client.js';

import * as whatsapp from '../integrations/whatsapp/index.js';
import { getInstanceState } from './whatsapp-runtime-state.service.js';

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
  avatarUrl?: string | null;
  workingHours?: Record<string, unknown>;
};

function isInstanceAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('already exists') ||
    message.includes('alreadyexist') ||
    message.includes('instance already') ||
    message.includes('duplicate key value') ||
    message.includes('instances_pkey') ||
    message.includes('sqlstate 23505') ||
    message.includes('409')
  );
}

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
    avatarUrl: string | null;
    whatsappInstanceId: string | null;
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
      avatarUrl: true,
      whatsappInstanceId: true,
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
      avatarUrl: user.avatarUrl,
      whatsappInstanceId: user.whatsappInstanceId,
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
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl || null }),
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
      avatarUrl: true,
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
): Promise<ServiceResult<{ qrcode: string | null; connected: boolean; phone?: string | null }>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { whatsappInstanceId: true },
  });
  if (!user) return { error: 'Usuário não encontrado', code: 'NOT_FOUND', statusCode: 404 };
  if (!user.whatsappInstanceId) {
    return { data: { qrcode: null, connected: false } };
  }
  if (!whatsapp.isConfigured()) {
    return { data: { qrcode: null, connected: false } };
  }
  const runtime = getInstanceState(user.whatsappInstanceId);
  if (runtime) {
    return {
      data: {
        qrcode: runtime.qrcode,
        connected: runtime.connected,
        phone: runtime.phone,
      },
    };
  }
  try {
    const result = await whatsapp.getConnectQr(user.whatsappInstanceId) as { base64?: string };
    return { data: { qrcode: result?.base64 ?? null, connected: false } };
  } catch (error) {
    console.error('[settings.getWhatsappQrcode] failed to load QR code', {
      userId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { data: { qrcode: null, connected: false } };
  }
}

export async function connectWhatsapp(
  userId: string,
  instanceName: string
): Promise<ServiceResult<{ instanceId: string }>> {
  const instanceId = userId;
  if (!whatsapp.isConfigured()) {
    return { error: 'WhatsApp não configurado', code: 'WHATSAPP_NOT_CONFIGURED', statusCode: 503 };
  }
  try {
    await whatsapp.createNamedInstance({ instanceId, name: instanceName.trim() });
  } catch (error) {
    console.error('[settings.connectWhatsapp] failed to create instance', {
      userId,
      instanceId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    if (!isInstanceAlreadyExistsError(error)) {
      return {
        error: 'Não foi possível criar a instância do WhatsApp',
        code: 'WHATSAPP_INSTANCE_CREATE_FAILED',
        statusCode: 502,
      };
    }
  }
  try {
    await whatsapp.connectInstance({ instanceId });
  } catch (error) {
    console.error('[settings.connectWhatsapp] failed to connect instance', {
      userId,
      instanceId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
  try {
    await whatsapp.configureInstance({ instanceId });
  } catch (error) {
    console.error('[settings.connectWhatsapp] failed to configure instance', {
      userId,
      instanceId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { whatsappInstanceId: instanceId },
  });
  return { data: { instanceId } };
}
