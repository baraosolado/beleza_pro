import type { FastifyRequest, FastifyReply } from 'fastify';

import { replyError } from '../lib/errors.js';
import * as dashboardService from '../services/dashboard.service.js';

export async function summary(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await dashboardService.summary(request.userId);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function upcoming(
  request: FastifyRequest<{ Querystring: { today?: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const todayOnly = request.query.today === '1' || request.query.today === 'true';
  const result = await dashboardService.upcoming(request.userId, { todayOnly });
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}

export async function financial(
  request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await dashboardService.financial(request.userId, request.query);
  if (result.error) return replyError(reply, result.statusCode, result.error, result.code);
  return reply.send(result.data);
}
