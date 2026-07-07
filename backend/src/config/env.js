import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const envBoolean = (defaultValue) => z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  HMAC_SECRET: z.string().min(32, 'HMAC_SECRET must have at least 32 characters'),
  ADMIN_TOKEN: z.string().min(16, 'ADMIN_TOKEN must have at least 16 characters'),
  TREASURY_WALLET: z.string().min(32),
  SOLANA_CLUSTER: z.enum(['devnet', 'mainnet-beta']).default('devnet'),
  SOLANA_COMMITMENT: z.enum(['confirmed', 'finalized']).optional(),
  REQUIRE_CHAIN_CONFIRMATION: envBoolean(true),
  MAX_TRANSACTION_AGE_SECONDS: z.coerce.number().int().positive().default(900),
  ALLOW_OVERPAYMENT: envBoolean(true),
  IGNORE_REMAINDER: envBoolean(true),
  MAX_TICKETS_PER_PURCHASE: z.coerce.number().int().positive().default(1000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  CORS_ORIGIN: z.string().optional()
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (
  parsed.data.NODE_ENV === 'production' &&
  parsed.data.HMAC_SECRET.includes('change-me')
) {
  console.error('Refusing to start production with a placeholder HMAC_SECRET');
  process.exit(1);
}

export const env = parsed.data;
env.SOLANA_COMMITMENT ??= env.NODE_ENV === 'production' ? 'finalized' : 'confirmed';

