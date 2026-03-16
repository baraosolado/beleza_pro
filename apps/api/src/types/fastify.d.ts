import type { Plan } from 'types';
import type { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userPlan: Plan;
    rawBody?: string;
  }
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest) => Promise<void>;
    requireActivePlan: (request: FastifyRequest) => Promise<void>;
  }
}
