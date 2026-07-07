import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function requireAdmin(req, _res, next) {
  const token = req.get('x-admin-token') || '';
  const expected = env.ADMIN_TOKEN;
  const ok =
    token.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));

  if (!ok) return next(new HttpError(401, 'Admin token required'));
  return next();
}

