import { Prisma } from '@prisma/client';

/**
 * Converte erros comuns do Prisma (schema/migration ausente) em resposta amigável.
 * Evita 500 genérico quando as tabelas do consórcio ainda não foram criadas.
 */
export function mapConsorcioDbError(e: unknown): {
  error: string;
  code: string;
  statusCode: number;
} | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2021') {
      return {
        error:
          'Tabelas do consórcio não existem no banco. Na pasta apps/api execute: npm run db:migrate — depois npm run db:generate — e reinicie a API.',
        code: 'DB_SCHEMA_OUTDATED',
        statusCode: 503,
      };
    }
    if (e.code === 'P2022') {
      return {
        error:
          'Coluna ausente no banco (Prisma/migration desatualizado). Rode npm run db:migrate e npm run db:generate em apps/api.',
        code: 'DB_COLUMN_MISSING',
        statusCode: 503,
      };
    }
  }
  return null;
}
