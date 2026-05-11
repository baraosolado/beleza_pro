import type { FastifyRequest, FastifyReply } from 'fastify';

import * as webhooksService from '../services/webhooks.service.js';

export async function uazapi(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  await webhooksService.handleUazapiEvent(request.body as Record<string, unknown>);
  return reply.status(200).send({ received: true });
}

export async function evolution(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  await webhooksService.handleEvolutionEvent(request.body as Record<string, unknown>);
  return reply.status(200).send({ received: true });
}
