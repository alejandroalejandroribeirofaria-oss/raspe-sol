import express from 'express';
import morgan from 'morgan';
import { publicRouter } from './routes/public.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { apiRateLimiter, corsMiddleware, helmetMiddleware } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', true);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(apiRateLimiter);
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan('combined'));

  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

