import type { FastifyInstance } from 'fastify';

import * as authController from '../controllers/auth.controller.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', authController.register);
  app.post('/login', authController.login);
  app.post('/refresh', authController.refresh);
  app.post('/forgot-password', authController.forgotPassword);
  app.post('/reset-password', authController.resetPassword);
}
