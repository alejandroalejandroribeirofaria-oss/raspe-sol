import { env } from '../config/env.js';
import { TICKET_PRICE_LAMPORTS } from '../constants.js';
import { HttpError } from '../utils/httpError.js';

export function normalizeRequestedQuantity(quantity) {
  if (quantity === undefined || quantity === null) return 1;
  const numeric = Number(quantity);
  if (!Number.isInteger(numeric) || numeric < 1) {
    throw new HttpError(400, 'Invalid quantity.');
  }
  return numeric;
}

export function calculatePurchasePlan({ amountLamports, requestedQuantity }) {
  const requested = normalizeRequestedQuantity(requestedQuantity);
  const requestedExpectedLamports = BigInt(requested) * TICKET_PRICE_LAMPORTS;
  const amount = BigInt(amountLamports);

  if (amount < requestedExpectedLamports) {
    throw new HttpError(400, 'Insufficient payment.');
  }

  if (!env.ALLOW_OVERPAYMENT && amount !== requestedExpectedLamports) {
    throw new HttpError(400, 'Payment amount mismatch.');
  }

  const paidTicketCount = Number(amount / TICKET_PRICE_LAMPORTS);
  const remainderLamports = amount % TICKET_PRICE_LAMPORTS;

  if (paidTicketCount < 1) {
    throw new HttpError(400, 'Insufficient payment.');
  }

  if (remainderLamports > 0n && !env.IGNORE_REMAINDER) {
    throw new HttpError(400, 'Payment contains unusable remainder.');
  }

  const ticketCount = env.ALLOW_OVERPAYMENT ? paidTicketCount : requested;
  if (ticketCount > env.MAX_TICKETS_PER_PURCHASE) {
    throw new HttpError(400, 'Maximum tickets per purchase exceeded.');
  }

  return {
    requestedQuantity: requested,
    ticketCount,
    amountLamports: amount,
    expectedLamports: BigInt(ticketCount) * TICKET_PRICE_LAMPORTS,
    requestedExpectedLamports,
    remainderLamports
  };
}

