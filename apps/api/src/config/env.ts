import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

// Carrega .env da raiz do monorepo (funciona com cwd = root ou cwd = apps/api)
const candidates = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '..', '.env'),
  path.join(process.cwd(), '..', '..', '.env'),
];
for (const p of candidates) {
  dotenv.config({ path: p });
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET é obrigatória'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET é obrigatória'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  UAZAPI_BASE_URL: z.string().optional(),
  UAZAPI_TOKEN: z.string().optional(),
  N8N_INVOICE_PREVIEW_WEBHOOK_URL: z.string().optional(),
  N8N_INVOICE_SEND_WEBHOOK_URL: z.string().optional(),
  REDIS_URL: z.string().min(1, 'REDIS_URL é obrigatória'),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  APP_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.flatten().fieldErrors;
  const messages = Object.entries(issues)
    .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
    .join('\n');
  throw new Error(`Variáveis de ambiente inválidas:\n${messages}`);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
