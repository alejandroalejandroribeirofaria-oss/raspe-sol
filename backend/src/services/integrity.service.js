import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const HMAC_FIELDS = [
  'id',
  'batchId',
  'batchNumber',
  'prizeLamports',
  'ticketPriceLamports',
  'publicHash',
  'seed',
  'createdAt',
  'purchasedAt',
  'scratchedAt',
  'paidAt',
  'buyerWallet',
  'status',
  'purchaseSignature',
  'purchaseSlot',
  'purchaseBlockTime',
  'transactionId',
  'loserMessage'
];

function normalizeValue(value) {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  return value;
}

export function ticketIntegrityPayload(ticket) {
  return HMAC_FIELDS.reduce((payload, field) => {
    payload[field] = normalizeValue(ticket[field]);
    return payload;
  }, {});
}

export function createTicketHmac(ticket) {
  return crypto
    .createHmac('sha256', env.HMAC_SECRET)
    .update(JSON.stringify(ticketIntegrityPayload(ticket)))
    .digest('hex');
}

export function createTicketPublicHash({ id, batchId, seed }) {
  return crypto
    .createHash('sha256')
    .update(`${id}:${batchId}:${seed}`)
    .digest('hex');
}

export function createTransactionReplayHash(payment) {
  return crypto
    .createHmac('sha256', env.HMAC_SECRET)
    .update(JSON.stringify({
      signature: payment.signature,
      wallet: payment.wallet,
      slot: normalizeValue(payment.slot),
      blockTime: normalizeValue(payment.blockTime),
      cluster: payment.cluster,
      amountLamports: normalizeValue(payment.amountLamports),
      treasuryWallet: env.TREASURY_WALLET
    }))
    .digest('hex');
}

export function assertTicketIntegrity(ticket) {
  const expected = createTicketHmac(ticket);
  const actual = ticket.hmac || '';
  const valid =
    actual.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));

  if (!valid) {
    throw new HttpError(409, 'Ticket integrity check failed');
  }
}

