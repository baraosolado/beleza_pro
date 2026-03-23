import { prisma } from '../db/prisma/client.js';

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
