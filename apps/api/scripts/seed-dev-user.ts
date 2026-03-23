/**
 * Cria ou atualiza usuário de desenvolvimento (admin + plano pro).
 * Uso (na raiz do monorepo): npx dotenv -e .env -- npm exec -w api -- tsx scripts/seed-dev-user.ts
 *
 * Não use credenciais fixas em produção — prefira variáveis de ambiente.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

const EMAIL_RAW = 'Josefata@gmail.com';
const PASSWORD = 'Josefata@gmail.com';
const DISPLAY_NAME = 'Desenvolvedor';

async function main(): Promise<void> {
  const email = EMAIL_RAW.trim().toLowerCase();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não encontrada. Use .env na raiz do monorepo.');
    process.exit(1);
  }

  const argon2 = (await import('argon2')).default;
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const passwordHash = await argon2.hash(PASSWORD);

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: DISPLAY_NAME,
        passwordHash,
        role: 'admin',
        plan: 'pro',
        planExpiresAt: null,
      },
      update: {
        name: DISPLAY_NAME,
        passwordHash,
        role: 'admin',
        plan: 'pro',
        planExpiresAt: null,
      },
    });

    console.log('Usuário desenvolvedor OK:');
    console.log('  E-mail (login):', user.email);
    console.log('  Nome:', user.name);
    console.log('  Papel:', user.role);
    console.log('  Plano:', user.plan);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
