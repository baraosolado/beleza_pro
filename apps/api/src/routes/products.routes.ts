import type { FastifyInstance } from 'fastify';

import * as productsController from '../controllers/products.controller.js';

export async function productsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireActivePlan);

  app.get('/', productsController.list);
  app.post('/', productsController.create);
  app.get('/:id', productsController.getById);
  app.put('/:id', productsController.update);
}

