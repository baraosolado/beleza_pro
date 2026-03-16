import type { FastifyInstance } from 'fastify';

import * as settingsController from '../controllers/settings.controller.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);

  app.get('/', settingsController.get);
  app.put('/', settingsController.update);
  app.put('/password', settingsController.changePassword);
  app.get('/whatsapp/qrcode', settingsController.getWhatsappQrcode);
  app.post('/whatsapp/connect', settingsController.connectWhatsapp);
}
