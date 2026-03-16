import type { FastifyInstance } from 'fastify';

import * as appointmentsController from '../controllers/appointments.controller.js';

export async function appointmentsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireActivePlan);

  app.get('/', appointmentsController.list);
  app.post('/', appointmentsController.create);
  app.get('/:id', appointmentsController.getById);
  app.put('/:id', appointmentsController.update);
  app.patch('/:id/status', appointmentsController.updateStatus);
  app.delete('/:id', appointmentsController.remove);
}
