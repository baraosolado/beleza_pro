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

/**
 * Extrai o nome do banco do path da URL Postgres.
 * Sem nome válido, o Prisma costuma falhar com: Database `(not available)` does not exist
 */
export function parsePostgresDatabaseName(databaseUrl: string): string | null {
  const trimmed = databaseUrl.trim();
  if (!trimmed) return null;
  try {
    const rest = trimmed.replace(/^postgres(ql)?:\/\//i, '');
    const at = rest.lastIndexOf('@');
    const hostAndPath = at >= 0 ? rest.slice(at + 1) : rest;
    const slash = hostAndPath.indexOf('/');
    if (slash < 0 || slash >= hostAndPath.length - 1) return null;
    let pathPart = hostAndPath.slice(slash + 1);
    const q = pathPart.indexOf('?');
    if (q >= 0) pathPart = pathPart.slice(0, q);
    const db = pathPart.split('/')[0]?.trim();
    if (!db || db === '') return null;
    return decodeURIComponent(db);
  } catch {
    return null;
  }
}

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL é obrigatória')
    .refine(
      (url) => parsePostgresDatabaseName(url) != null,
      {
        message:
          'DATABASE_URL precisa incluir o nome do banco após a porta. Ex.: postgresql://beleza:beleza_secret@localhost:5432/beleza_saas (não termine em :5432 sem o /nome_do_banco)',
      }
    ),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET é obrigatória'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET é obrigatória'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  UAZAPI_BASE_URL: z.string().optional(),
  UAZAPI_TOKEN: z.string().optional(),
  N8N_INVOICE_PREVIEW_WEBHOOK_URL: z.string().optional(),
  N8N_INVOICE_SEND_WEBHOOK_URL: z.string().optional(),
  /** Webhook n8n: solicita sorteio + vídeo (ganhadora devolvida por nome completo). */
  N8N_CONSORCIO_DRAW_WEBHOOK_URL: z.string().optional(),
  /** Webhook n8n: após preview no SaaS, envia vídeo/mensagem (ex.: WhatsApp). Opcional. */
  N8N_CONSORCIO_SEND_WEBHOOK_URL: z.string().optional(),
  /** Webhook n8n: upload de revista (PDF) → MinIO/S3 → retorna URL pública. Obrigatório para cadastrar PDFs. */
  N8N_CONSORCIO_PDF_UPLOAD_WEBHOOK_URL: z.string().optional(),
  /** Webhook n8n: enviar revista (link/base64) para qualquer cliente cadastrado (menu Clientes). */
  N8N_CONSORCIO_REVISTA_CLIENT_WEBHOOK_URL: z.string().optional(),
  /** Em dev pode ficar vazio: filas BullMQ (WhatsApp/lembretes) ficam desativadas. Em produção é obrigatória. */
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  APP_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      const r = (data.REDIS_URL ?? '').trim();
      if (!r) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'REDIS_URL é obrigatória em produção',
          path: ['REDIS_URL'],
        });
      }
    }
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
