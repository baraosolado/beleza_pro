import path from 'node:path';

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const rootEnv = path.resolve(process.cwd(), '.env');
const monorepoRoot = path.resolve(process.cwd(), '..', '..');
dotenv.config({ path: rootEnv });
dotenv.config({ path: path.join(monorepoRoot, '.env') });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
