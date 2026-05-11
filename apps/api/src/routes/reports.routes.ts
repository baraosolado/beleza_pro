import type { FastifyInstance } from 'fastify';

import * as reportsController from '../controllers/reports.controller.js';

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireActivePlan);

  app.get('/', reportsController.full);
}
