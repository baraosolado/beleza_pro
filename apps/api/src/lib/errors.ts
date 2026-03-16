import type { FastifyReply } from 'fastify';

export function replyError(
  reply: FastifyReply,
  statusCode: number,
  error: string,
  code: string
): FastifyReply {
  return reply.status(statusCode).send({ error, code });
}
