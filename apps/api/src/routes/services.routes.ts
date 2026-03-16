import type { FastifyInstance } from 'fastify';

import * as servicesController from '../controllers/services.controller.js';

export async function servicesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireActivePlan);

  app.get('/', servicesController.list);
  app.post('/', servicesController.create);
  app.put('/:id', servicesController.update);
  app.delete('/:id', servicesController.remove);
}
