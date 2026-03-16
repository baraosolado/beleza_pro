import type { FastifyRequest, FastifyReply } from 'fastify';

import { env } from '../config/env.js';
import { replyError } from '../lib/errors.js';
import { constructWebhookEvent, getStripe } from '../integrations/stripe.js';
import * as webhooksService from '../services/webhooks.service.js';

export async function stripe(
  request: FastifyRequest<{ Headers: { 'stripe-signature'?: string }; Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return replyError(reply, 503, 'Webhook não configurado', 'WEBHOOK_NOT_CONFIGURED');
  }
  const stripe = getStripe();
  if (!stripe) {
    return replyError(reply, 503, 'Stripe não configurado', 'STRIPE_NOT_CONFIGURED');
  }
  const signature = request.headers['stripe-signature'];
  if (!signature) {
    return replyError(reply, 400, 'Assinatura ausente', 'MISSING_SIGNATURE');
  }
  const rawBody =
    (request as { rawBody?: string }).rawBody ?? JSON.stringify(request.body);
  let event: ReturnType<typeof constructWebhookEvent>;
  try {
    event = constructWebhookEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Assinatura inválida';
    return replyError(reply, 400, message, 'INVALID_SIGNATURE');
  }
  const result = await webhooksService.handleStripeEvent(event);
  if (result.error) {
    return replyError(reply, result.statusCode, result.error, result.code);
  }
  return reply.status(200).send({ received: true });
}

export async function uazapi(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  await webhooksService.handleUazapiEvent(request.body as Record<string, unknown>);
  return reply.status(200).send({ received: true });
}
