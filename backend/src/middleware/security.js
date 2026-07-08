import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// 1. HELMET - Headers de segurança
export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // desliga pra API. Liga só se for servir front
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// 2. CORS - Libera só os domínios que tu definir
const allowedOrigins = env.CORS_ORIGIN 
  ? env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['*'];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Libera requisições sem origin tipo Postman/curl
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
  maxAge: 86400 // cache do preflight por 24h
});

// 3. RATE LIMIT - Anti spam e DDoS burro
const windowMs = Number(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min default
const max = Number(env.RATE_LIMIT_MAX) || 100; // 100 req default

export const apiRateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: `Limite de ${max} requisições a cada ${windowMs / 60000} minutos atingido`
  }
});
