import type { FastifyInstance } from 'fastify';

import * as chargesController from '../controllers/charges.controller.js';

export async function chargesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireActivePlan);

  app.get('/', chargesController.list);
  app.post('/', chargesController.create);
  app.get('/:id', chargesController.getById);
  app.put('/:id', chargesController.update);
  app.get('/:id/pix', chargesController.getPix);
  app.get('/:id/payment-link', chargesController.getPaymentLink);
  app.delete('/:id', chargesController.remove);
}
