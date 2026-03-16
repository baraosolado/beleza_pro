import type { FastifyInstance } from 'fastify';

import * as webhooksController from '../controllers/webhooks.controller.js';

export async function webhooksRoutes(app: FastifyInstance): Promise<void> {
  app.post('/stripe', webhooksController.stripe);
  app.post('/uazapi', webhooksController.uazapi);
}
