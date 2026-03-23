import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Exige JWT válido já aplicado (`authenticate`) e `users.role === 'admin'`.
 */
async function adminMiddleware(fastify: FastifyInstance): Promise<void> {
  fastify.decorate('requireAdmin', async function (request: FastifyRequest) {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.userId },
      select: { role: true },
    });
    if (!user || user.role !== 'admin') {
      throw fastify.httpErrors.forbidden('Acesso restrito a administradores.');
    }
  });
}

export default fp(adminMiddleware, { name: 'admin-middleware' });
