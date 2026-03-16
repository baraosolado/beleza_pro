import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

async function authMiddleware(fastify: FastifyInstance): Promise<void> {
  fastify.decorate('authenticate', async function (request: FastifyRequest) {
    try {
      await request.jwtVerify();
      const payload = request.user as { sub: string; plan?: string };
      request.userId = payload.sub;
      request.userPlan = (payload.plan as 'trial' | 'basic' | 'pro') ?? 'trial';
    } catch {
      throw fastify.httpErrors.unauthorized('Token inválido ou expirado');
    }
  });
}

export default fp(authMiddleware, { name: 'auth-middleware' });
