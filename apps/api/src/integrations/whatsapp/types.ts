export type SendTextParams = {
  instanceId: string;
  phone: string;
  text: string;
};

export type SendMediaParams = {
  instanceId: string;
  phone: string;
  mediaUrl: string;
  caption?: string;
};

export type WhatsAppProvider = {
  connectInstance: (params: { instanceId: string }) => Promise<unknown>;
  configureInstance: (params: { instanceId: string }) => Promise<unknown>;
  createInstance: (params: { instanceId: string; name?: string }) => Promise<unknown>;
  getConnectQr: (instanceId: string) => Promise<{ base64?: string } | unknown>;
  isConfigured: () => boolean;
  sendMedia: (params: SendMediaParams) => Promise<unknown>;
  sendText: (params: SendTextParams) => Promise<unknown>;
};
