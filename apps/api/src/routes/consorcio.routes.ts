import type { FastifyInstance } from 'fastify';

import * as consorcioController from '../controllers/consorcio.controller.js';

export async function consorcioRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireActivePlan);

  app.get('/', consorcioController.getOverview);
  app.get('/last-draw-winner', consorcioController.getLastDrawWinner);
  app.patch('/settings', consorcioController.patchSettings);
  app.post('/participants', consorcioController.addParticipant);
  app.delete('/participants/:id', consorcioController.removeParticipant);
  app.post('/draw', consorcioController.runDraw);
  app.post('/reset', consorcioController.resetCycle);
  app.get('/pdfs', consorcioController.listPdfs);
  app.get('/pdfs/history', consorcioController.listPdfSendHistory);
  app.post('/pdfs', consorcioController.uploadPdf);
  app.get('/pdfs/:pdfId/download', consorcioController.downloadPdf);
  app.delete('/pdfs/:pdfId', consorcioController.deletePdf);
  app.post('/pdfs/:pdfId/send-whatsapp', consorcioController.sendPdfToParticipant);
  app.post('/pdfs/:pdfId/send-to-client-webhook', consorcioController.sendPdfToClientWebhook);
  app.get('/draws/:drawId/video-preview', consorcioController.getDrawVideoPreview);
  app.post('/draws/:drawId/send-whatsapp', consorcioController.sendDrawWhatsapp);
  app.patch('/draws/:drawId/video', consorcioController.patchDrawVideo);
}
