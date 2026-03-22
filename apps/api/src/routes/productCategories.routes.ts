import type { FastifyInstance } from 'fastify';

import * as productCategoriesController from '../controllers/productCategories.controller.js';

export async function productCategoriesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireActivePlan);

  app.get('/', productCategoriesController.list);
  app.post('/', productCategoriesController.create);
}

