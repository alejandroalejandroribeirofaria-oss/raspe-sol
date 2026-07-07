import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import {
  BATCH_STATUS,
  LOSER_MESSAGES,
  PRIZE_DISTRIBUTION,
  TICKET_STATUS,
  TICKET_PRICE_LAMPORTS,
  TICKETS_PER_BATCH
} from '../constants.js';
import { createTicketHmac, createTicketPublicHash } from './integrity.service.js';
import { audit } from './audit.service.js';
import { pickUniquePositions, randomItem } from '../utils/random.js';

function buildPrizeMap() {
  const prizeMap = new Map();
  const totalPrizes = PRIZE_DISTRIBUTION.reduce((sum, item) => sum + item.count, 0);
  const positions = pickUniquePositions(TICKETS_PER_BATCH, totalPrizes);
  let cursor = 0;

  for (const prize of PRIZE_DISTRIBUTION) {
    for (let i = 0; i < prize.count; i += 1) {
      prizeMap.set(positions[cursor], prize.lamports);
      cursor += 1;
    }
  }

  return prizeMap;
}

export async function ensureOpenBatch() {
  const current = await prisma.batch.findFirst({
    where: { status: BATCH_STATUS.OPEN },
    orderBy: { number: 'desc' }
  });

  if (current) return current;
  return createBatch({ reason: 'bootstrap' });
}

export async function createBatch({ reason = 'manual', ip, wallet } = {}, tx = prisma) {
  const last = await tx.batch.findFirst({ orderBy: { number: 'desc' } });
  const number = (last?.number ?? 0) + 1;

  const batch = await tx.batch.create({
    data: { number, status: BATCH_STATUS.OPEN }
  });

  const now = new Date();
  const prizeMap = buildPrizeMap();
  const tickets = Array.from({ length: TICKETS_PER_BATCH }, (_, index) => {
    const id = crypto.randomUUID();
    const seed = crypto.randomBytes(32).toString('hex');
    const ticket = {
      id,
      batchId: batch.id,
      batchNumber: number,
      prizeLamports: prizeMap.get(index) ?? 0n,
      ticketPriceLamports: TICKET_PRICE_LAMPORTS,
      seed,
      publicHash: createTicketPublicHash({ id, batchId: batch.id, seed }),
      createdAt: now,
      purchasedAt: null,
      scratchedAt: null,
      paidAt: null,
      buyerWallet: null,
      status: 'AVAILABLE',
      purchaseSignature: null,
      purchaseSlot: null,
      purchaseBlockTime: null,
      transactionId: null,
      loserMessage: prizeMap.has(index) ? null : randomItem(LOSER_MESSAGES)
    };

    return { ...ticket, hmac: createTicketHmac(ticket) };
  });

  await tx.ticket.createMany({ data: tickets });
  await audit('BATCH_CREATED', {
    batchId: batch.id,
    ip,
    wallet,
    metadata: { number, reason, tickets: TICKETS_PER_BATCH }
  }, tx);

  return batch;
}

export async function closeBatchIfSoldOut(batchId, tx = prisma) {
  const remaining = await tx.ticket.count({
    where: { batchId, status: TICKET_STATUS.AVAILABLE }
  });

  if (remaining > 0) return null;

  const batch = await tx.batch.update({
    where: { id: batchId },
    data: { status: BATCH_STATUS.CLOSED, closedAt: new Date() }
  });

  await audit('BATCH_CLOSED', { batchId }, tx);
  return batch;
}

export async function getBatchStats() {
  await ensureOpenBatch();
  const open = await prisma.batch.findFirst({
    where: { status: BATCH_STATUS.OPEN },
    orderBy: { number: 'desc' }
  });

  const [available, sold, scratched, prized, history] = await Promise.all([
    prisma.ticket.count({ where: { batchId: open.id, status: 'AVAILABLE' } }),
    prisma.ticket.count({ where: { batchId: open.id, status: { in: ['SOLD', 'SCRATCHED', 'PRIZE_PAID'] } } }),
    prisma.ticket.count({ where: { batchId: open.id, status: { in: ['SCRATCHED', 'PRIZE_PAID'] } } }),
    prisma.ticket.count({ where: { batchId: open.id, prizeLamports: { gt: 0 } } }),
    prisma.batch.findMany({ orderBy: { number: 'desc' }, take: 50 })
  ]);

  return { open, available, sold, scratched, prized, history };
}

