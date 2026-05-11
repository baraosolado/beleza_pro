type InstanceState = {
  connected: boolean;
  phone: string | null;
  qrcode: string | null;
  updatedAt: number;
};

const stateByInstance = new Map<string, InstanceState>();

export function setInstanceQrCode(instanceId: string, qrcode: string | null): void {
  const current = stateByInstance.get(instanceId);
  stateByInstance.set(instanceId, {
    connected: current?.connected ?? false,
    phone: current?.phone ?? null,
    qrcode,
    updatedAt: Date.now(),
  });
}

export function setInstanceConnection(
  instanceId: string,
  connected: boolean,
  phone?: string | null
): void {
  const current = stateByInstance.get(instanceId);
  stateByInstance.set(instanceId, {
    connected,
    phone: phone ?? current?.phone ?? null,
    qrcode: connected ? null : (current?.qrcode ?? null),
    updatedAt: Date.now(),
  });
}

export function getInstanceState(instanceId: string): InstanceState | null {
  const state = stateByInstance.get(instanceId);
  if (!state) return null;
  return state;
}
