import path from 'node:path';

import dotenv from 'dotenv';
// Em ESM, o @prisma/client costuma expor apenas `default`. Por isso, usamos default import
// e extraímos o PrismaClient por propriedade.
import prismaClientPkg from '@prisma/client';

const { PrismaClient } = prismaClientPkg as unknown as {
  PrismaClient: typeof import('@prisma/client').PrismaClient;
};

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
