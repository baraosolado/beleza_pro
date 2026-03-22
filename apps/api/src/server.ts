import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';

import { env } from './config/env.js';
import { prisma } from './db/prisma/client.js';
import authMiddleware from './middleware/auth.js';
import planMiddleware from './middleware/plan.js';
import { authRoutes } from './routes/auth.routes.js';
import { appointmentsRoutes } from './routes/appointments.routes.js';
import { chargesRoutes } from './routes/charges.routes.js';
import { clientsRoutes } from './routes/clients.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { sendInvoiceRoutes } from './routes/sendInvoice.routes.js';
import { productsRoutes } from './routes/products.routes.js';
import { productCategoriesRoutes } from './routes/productCategories.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { servicesRoutes } from './routes/services.routes.js';
import { webhooksRoutes } from './routes/webhooks.routes.js';

import './jobs/whatsapp.job.js';
import './jobs/reminders.job.js';

const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin) || (env.APP_URL ? origin === env.APP_URL : false);
}

async function build() {
  const app = Fastify({ logger: true });

  // CORS: aplicar antes de qualquer outro plugin para preflight e respostas de erro
  app.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin;
    if (isAllowedOrigin(origin)) {
      reply.header('Access-Control-Allow-Origin', origin ?? '*');
    }
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    reply.header('Access-Control-Max-Age', '86400');
    if (request.method === 'OPTIONS') {
      reply.status(204).send();
      done();
      return;
    }
    done();
  });

  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req, body, done) => {
      const raw = typeof body === 'string' ? body : (body as Buffer).toString('utf8');
      (req as { rawBody?: string }).rawBody = raw;
      try {
        done(null, JSON.parse(raw) as unknown);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  await app.register(cors, {
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(sensible);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.decorate('prisma', prisma);

  await app.register(authMiddleware);
  await app.register(planMiddleware);

  app.setErrorHandler((err, _request, reply) => {
    app.log.error(err);
    const code = err.code ?? 'INTERNAL_ERROR';
    const statusCode = err.statusCode ?? 500;
    const message = statusCode >= 500 ? 'Erro interno do servidor' : (err.message ?? 'Erro');
    return reply.status(statusCode).send({ error: message, code });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(
    async (scope) => {
      scope.register(authRoutes, { prefix: '/auth' });
      scope.register(clientsRoutes, { prefix: '/clients' });
      scope.register(servicesRoutes, { prefix: '/services' });
      scope.register(productsRoutes, { prefix: '/products' });
      scope.register(productCategoriesRoutes, { prefix: '/product-categories' });
      scope.register(appointmentsRoutes, { prefix: '/appointments' });
      scope.register(chargesRoutes, { prefix: '/charges' });
      scope.register(dashboardRoutes, { prefix: '/dashboard' });
      scope.register(sendInvoiceRoutes, { prefix: '/send-invoice' });
      scope.register(settingsRoutes, { prefix: '/settings' });
      scope.register(webhooksRoutes, { prefix: '/webhooks' });
    },
    { prefix: '/api' }
  );

  return app;
}

const start = async () => {
  try {
    const app = await build();
    await app.listen({ port: 3001, host: '0.0.0.0' });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
