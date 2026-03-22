import type { FastifyInstance } from 'fastify';

import * as sendInvoiceController from '../controllers/sendInvoice.controller.js';

export async function sendInvoiceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.post('/preview', sendInvoiceController.preview);
  app.post('/send', sendInvoiceController.send);
}
