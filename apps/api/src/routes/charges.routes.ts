import type { FastifyInstance } from 'fastify';

import * as chargesController from '../controllers/charges.controller.js';

export async function chargesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireActivePlan);

  app.get('/', chargesController.list);
  app.post('/', chargesController.create);
  app.get('/:id', chargesController.getById);
  app.put('/:id', chargesController.update);
  app.delete('/:id', chargesController.remove);
}
