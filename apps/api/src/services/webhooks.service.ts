import { prisma } from '../db/prisma/client.js';
import {
  setInstanceConnection,
  setInstanceQrCode,
} from './whatsapp-runtime-state.service.js';

export async function handleUazapiEvent(payload: Record<string, unknown>): Promise<void> {
  const instanceId = (payload.instance_id ?? payload.instanceId) as string | undefined;
  const phone = (payload.phone ?? payload.from) as string | undefined;
  const message = (payload.message ?? payload.body) as string | undefined;
  if (!instanceId || !message) return;
  const user = await prisma.user.findFirst({
    where: { whatsappInstanceId: instanceId },
    select: { id: true },
  });
  if (!user) return;
  await prisma.whatsAppMessage.create({
    data: {
      userId: user.id,
      phone: phone ? String(phone).replace(/\D/g, '').slice(-11) : 'unknown',
      message: String(message).slice(0, 4096),
      type: 'custom',
      status: 'pending',
    },
  });
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export async function handleEvolutionEvent(payload: Record<string, unknown>): Promise<void> {
  const rootInstanceId = getString(payload.instanceId) ?? getString(payload.instance_id);
  const data = getObject(payload.data);
  const dataInstanceId = data
    ? getString(data.instanceId) ?? getString(data.instance_id)
    : null;
  const instanceId = rootInstanceId ?? dataInstanceId;
  if (!instanceId) return;

  const event = (getString(payload.event) ?? '').toUpperCase();
  const qrcode =
    getString(payload.qrcode) ??
    getString(payload.base64) ??
    (data ? getString(data.qrcode) ?? getString(data.base64) : null);
  if (qrcode) {
    setInstanceQrCode(instanceId, qrcode);
  }

  const phone =
    getString(payload.phone) ??
    getString(payload.number) ??
    (data ? getString(data.phone) ?? getString(data.number) : null);
  const connectedValue =
    payload.connected ?? payload.isConnected ?? (data ? data.connected ?? data.isConnected : null);
  const connected =
    typeof connectedValue === 'boolean'
      ? connectedValue
      : typeof connectedValue === 'string'
        ? ['true', 'connected', 'open'].includes(connectedValue.toLowerCase())
        : false;

  if (event.includes('QRCODE') && qrcode) {
    setInstanceConnection(instanceId, false, phone);
    return;
  }

  if (event.includes('CONNECTION') || event.includes('STATUS')) {
    setInstanceConnection(instanceId, connected, phone);
    return;
  }

  if (connectedValue !== null) {
    setInstanceConnection(instanceId, connected, phone);
  }
}
