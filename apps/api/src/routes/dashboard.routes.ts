import type { FastifyInstance } from 'fastify';

import * as dashboardController from '../controllers/dashboard.controller.js';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireActivePlan);

  app.get('/summary', dashboardController.summary);
  app.get('/upcoming', dashboardController.upcoming);
  app.get('/financial', dashboardController.financial);
}
