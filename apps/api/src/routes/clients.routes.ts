import type { FastifyInstance } from 'fastify';

import * as clientsController from '../controllers/clients.controller.js';

export async function clientsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireActivePlan);

  app.get('/', clientsController.list);
  app.post('/', clientsController.create);
  app.get('/:id', clientsController.getById);
  app.put('/:id', clientsController.update);
  app.delete('/:id', clientsController.remove);
  app.get('/:id/appointments', clientsController.getAppointments);
}
