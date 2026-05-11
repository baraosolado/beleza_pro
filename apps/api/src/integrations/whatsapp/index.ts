import { env } from '../../config/env.js';
import { evolutionProvider } from '../evolution.js';
import { uazapiProvider } from '../uazapi.js';
import type { SendMediaParams, SendTextParams, WhatsAppProvider } from './types.js';

const providerByName: Record<'uazapi' | 'evolution', WhatsAppProvider> = {
  evolution: evolutionProvider,
  uazapi: uazapiProvider,
};

const activeProvider = providerByName[env.WHATSAPP_PROVIDER];

export function createInstance(instanceId: string): Promise<unknown> {
  return activeProvider.createInstance({ instanceId });
}

export function createNamedInstance(params: { instanceId: string; name?: string }): Promise<unknown> {
  return activeProvider.createInstance(params);
}

export function connectInstance(params: { instanceId: string }): Promise<unknown> {
  return activeProvider.connectInstance(params);
}

export function configureInstance(params: { instanceId: string }): Promise<unknown> {
  return activeProvider.configureInstance(params);
}

export function getConnectQr(instanceId: string): Promise<{ base64?: string } | unknown> {
  return activeProvider.getConnectQr(instanceId);
}

export function isConfigured(): boolean {
  return activeProvider.isConfigured();
}

export function sendMedia(params: SendMediaParams): Promise<unknown> {
  return activeProvider.sendMedia(params);
}

export function sendText(params: SendTextParams): Promise<unknown> {
  return activeProvider.sendText(params);
}
