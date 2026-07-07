import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : true,
  credentials: true
});

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

