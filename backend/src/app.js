import express from 'express';
import morgan from 'morgan';
import { publicRouter } from './routes/public.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { apiRateLimiter, corsMiddleware, helmetMiddleware } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  
  // 1 = confia só no 1º proxy. Tira o warning do Render
  app.set('trust proxy', 1); 

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(apiRateLimiter);
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan('combined'));

  // ROTA RAIZ - pra nao dar 404
  app.get('/', (req, res) => {
    res.json({ status: "Raspe SOL API ON", version: "1.0.0" });
  });

  // SUAS ROTAS
  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

