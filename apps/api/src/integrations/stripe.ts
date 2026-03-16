import Stripe from 'stripe';

import { env } from '../config/env.js';

const stripe =
  env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.length > 0
    ? new Stripe(env.STRIPE_SECRET_KEY)
    : null;

export function getStripe(): Stripe | null {
  return stripe;
}

export async function createCustomer(params: {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer | null> {
  if (!stripe) return null;
  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata,
  });
}

export async function createSubscription(params: {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Subscription | null> {
  if (!stripe) return null;
  return stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: params.priceId }],
    metadata: params.metadata,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}

export async function createPaymentIntent(params: {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
}): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) return null;
  const base: Stripe.PaymentIntentCreateParams = {
    amount: Math.round(params.amount * 100),
    currency: params.currency,
    customer: params.customerId,
    metadata: params.metadata,
  };

  if (params.paymentMethodTypes && params.paymentMethodTypes.length > 0) {
    base.payment_method_types = params.paymentMethodTypes;
  } else {
    // Deixa o Stripe escolher automaticamente os métodos disponíveis
    base.automatic_payment_methods = { enabled: true };
  }

  return stripe.paymentIntents.create(base);
}

export async function cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) return null;
  return stripe.paymentIntents.cancel(paymentIntentId);
}

export async function retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) return null;
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!stripe) return null;
  return stripe.subscriptions.cancel(subscriptionId);
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  if (!stripe) throw new Error('Stripe não configurado');
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
