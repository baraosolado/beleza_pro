import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

const PLAN_GRACE_DAYS = 7;

async function planMiddleware(fastify: FastifyInstance): Promise<void> {
  fastify.decorate('requireActivePlan', async function (this: FastifyInstance, request: FastifyRequest) {
    const scope = this;
    const { prisma } = scope;
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { plan: true, planExpiresAt: true },
    });
    if (!user) {
      throw scope.httpErrors.unauthorized('Usuário não encontrado');
    }
    const now = new Date();
    const expiresAt = user.planExpiresAt;
    if (expiresAt && expiresAt < now) {
      const graceEnd = new Date(expiresAt);
      graceEnd.setDate(graceEnd.getDate() + PLAN_GRACE_DAYS);
      if (now > graceEnd) {
        throw scope.httpErrors.forbidden('Plano vencido. Renove para continuar.');
      }
    }
  });
}

export default fp(planMiddleware, { name: 'plan-middleware' });
