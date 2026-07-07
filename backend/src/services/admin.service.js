import { prisma } from '../config/prisma.js';
import { BATCH_STATUS, TICKET_STATUS } from '../constants.js';
import { createBatch, ensureOpenBatch, getBatchStats } from './batch.service.js';
import { audit } from './audit.service.js';
import { assertTicketIntegrity } from './integrity.service.js';

export async function dashboardStats() {
  return getBatchStats();
}

export async function createManualBatch({ ip }) {
  return prisma.$transaction(async (tx) => {
    const open = await tx.batch.findFirst({ where: { status: BATCH_STATUS.OPEN } });
    if (open) {
      await tx.batch.update({
        where: { id: open.id },
        data: { status: BATCH_STATUS.CLOSED, closedAt: new Date() }
      });
      await audit('BATCH_CLOSED', { batchId: open.id, ip, metadata: { reason: 'manual_rollover' } }, tx);
    }
    return createBatch({ reason: 'manual', ip }, tx);
  }, { timeout: 30_000 });
}

export async function createAutomaticBatch({ ip }) {
  const open = await ensureOpenBatch();
  await audit('BATCH_AUTO_CREATE_REQUESTED', { batchId: open.id, ip }, prisma);
  return open;
}

export async function searchTickets({ uuid, wallet, batch }) {
  const where = {};
  if (uuid) where.id = uuid;
  if (wallet) where.buyerWallet = wallet;
  if (batch) where.batchNumber = Number(batch);

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  return tickets.map((ticket) => {
    assertTicketIntegrity(ticket);
    return ticket;
  });
}

export async function markPrizePaid({ uuid, ip }) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({ where: { id: uuid } });
    if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });
    assertTicketIntegrity(ticket);

    if (ticket.prizeLamports <= 0n) {
      throw Object.assign(new Error('Ticket has no prize'), { status: 409 });
    }
    if (ticket.status !== TICKET_STATUS.SCRATCHED) {
      throw Object.assign(new Error('Ticket must be scratched before payout'), { status: 409 });
    }

    const { createTicketHmac } = await import('./integrity.service.js');
    const payload = { ...ticket, status: TICKET_STATUS.PRIZE_PAID, paidAt: new Date() };
    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: payload.status,
        paidAt: payload.paidAt,
        hmac: createTicketHmac(payload)
      }
    });

    await audit('PRIZE_PAID', {
      ticketId: updated.id,
      batchId: updated.batchId,
      wallet: updated.buyerWallet,
      ip,
      metadata: { prizeLamports: updated.prizeLamports.toString() }
    }, tx);

    return updated;
  });
}

export async function exportReport() {
  const tickets = await prisma.ticket.findMany({
    orderBy: [{ batchNumber: 'asc' }, { createdAt: 'asc' }]
  });

  const headers = [
    'uuid',
    'batch',
    'status',
    'prizeLamports',
    'ticketPriceLamports',
    'publicHash',
    'transactionId',
    'buyerWallet',
    'purchasedAt',
    'scratchedAt',
    'paidAt',
    'purchaseSignature',
    'purchaseSlot',
    'purchaseBlockTime'
  ];

  const rows = tickets.map((ticket) => [
    ticket.id,
    ticket.batchNumber,
    ticket.status,
    ticket.prizeLamports.toString(),
    ticket.ticketPriceLamports.toString(),
    ticket.publicHash,
    ticket.transactionId || '',
    ticket.buyerWallet || '',
    ticket.purchasedAt?.toISOString() || '',
    ticket.scratchedAt?.toISOString() || '',
    ticket.paidAt?.toISOString() || '',
    ticket.purchaseSignature || '',
    ticket.purchaseSlot?.toString() || '',
    ticket.purchaseBlockTime?.toISOString() || ''
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

