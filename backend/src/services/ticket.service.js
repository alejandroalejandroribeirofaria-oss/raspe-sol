import { prisma } from '../config/prisma.js';
import { BATCH_STATUS, TICKET_STATUS } from '../constants.js';
import { HttpError } from '../utils/httpError.js';
import { mapPurchasePrismaError, serializableTransactionOptions } from '../utils/prismaErrors.js';
import { audit } from './audit.service.js';
import { createBatch, ensureOpenBatch } from './batch.service.js';
import {
  assertTicketIntegrity,
  createTicketHmac,
  createTransactionReplayHash
} from './integrity.service.js';
import { calculatePurchasePlan } from './purchase-plan.service.js';
import { verifyPurchaseTransaction } from './solana.service.js';

function publicTicket(ticket, reveal = false) {
  return {
    id: ticket.id,
    publicHash: ticket.publicHash,
    batchNumber: ticket.batchNumber,
    status: ticket.status,
    createdAt: ticket.createdAt,
    purchasedAt: ticket.purchasedAt,
    scratchedAt: ticket.scratchedAt,
    paidAt: ticket.paidAt,
    buyerWallet: ticket.buyerWallet,
    purchaseSignature: ticket.purchaseSignature,
    purchaseSlot: ticket.purchaseSlot,
    purchaseBlockTime: ticket.purchaseBlockTime,
    transactionId: ticket.transactionId,
    ticketPriceLamports: ticket.ticketPriceLamports,
    prizeLamports: reveal ? ticket.prizeLamports : undefined,
    loserMessage: reveal && ticket.prizeLamports === 0n ? ticket.loserMessage : undefined
  };
}

async function reserveAvailableTickets({ tx, ticketCount, payment, transactionId, purchasedAt }) {
  const reserved = [];
  let remaining = ticketCount;

  while (remaining > 0) {
    let openBatch = await tx.batch.findFirst({
      where: { status: BATCH_STATUS.OPEN },
      orderBy: { number: 'asc' }
    });

    if (!openBatch) {
      openBatch = await createBatch({ reason: 'auto-empty' }, tx);
    }

    const candidates = await tx.ticket.findMany({
      where: { batchId: openBatch.id, status: TICKET_STATUS.AVAILABLE },
      orderBy: { createdAt: 'asc' },
      take: remaining
    });

    if (candidates.length === 0) {
      await tx.batch.update({
        where: { id: openBatch.id },
        data: { status: BATCH_STATUS.CLOSED, closedAt: new Date() }
      });
      await audit('BATCH_CLOSED', {
        batchId: openBatch.id,
        metadata: { reason: 'sold_out' }
      }, tx);
      continue;
    }

    for (const ticket of candidates) {
      assertTicketIntegrity(ticket);
      const updatedPayload = {
        ...ticket,
        status: TICKET_STATUS.SOLD,
        buyerWallet: payment.wallet,
        purchasedAt,
        purchaseSignature: payment.signature,
        purchaseSlot: payment.slot,
        purchaseBlockTime: payment.blockTime,
        transactionId
      };

      const updateResult = await tx.ticket.updateMany({
        where: { id: ticket.id, status: TICKET_STATUS.AVAILABLE },
        data: {
          status: updatedPayload.status,
          buyerWallet: updatedPayload.buyerWallet,
          purchasedAt: updatedPayload.purchasedAt,
          purchaseSignature: updatedPayload.purchaseSignature,
          purchaseSlot: updatedPayload.purchaseSlot,
          purchaseBlockTime: updatedPayload.purchaseBlockTime,
          transactionId: updatedPayload.transactionId,
          hmac: createTicketHmac(updatedPayload)
        }
      });

      if (updateResult.count !== 1) {
        throw new HttpError(409, 'Ticket was already reserved');
      }

      reserved.push(ticket.id);
    }

    remaining -= candidates.length;

    const batchRemaining = await tx.ticket.count({
      where: { batchId: openBatch.id, status: TICKET_STATUS.AVAILABLE }
    });

    if (batchRemaining === 0) {
      await tx.batch.update({
        where: { id: openBatch.id },
        data: { status: BATCH_STATUS.CLOSED, closedAt: new Date() }
      });
      await audit('BATCH_CLOSED', {
        batchId: openBatch.id,
        metadata: { reason: 'sold_out' }
      }, tx);
      if (remaining > 0) {
        await createBatch({ reason: 'auto-sold-out' }, tx);
      }
    }
  }

  return tx.ticket.findMany({
    where: { id: { in: reserved } },
    orderBy: { purchasedAt: 'desc' }
  });
}

export async function purchaseTicket({ wallet, signature, cluster, quantity, ip, userAgent }) {
  try {
    const payment = await verifyPurchaseTransaction({ wallet, signature, cluster });

    return await prisma.$transaction(async (tx) => {
      const duplicate = await tx.transactionRecord.findUnique({
        where: { purchaseSignature: payment.signature }
      });
      if (duplicate) {
        throw new HttpError(409, 'Transaction already used.');
      }

      const plan = calculatePurchasePlan({
        amountLamports: payment.amountLamports,
        requestedQuantity: quantity
      });

      const transactionRecord = await tx.transactionRecord.create({
        data: {
          purchaseSignature: payment.signature,
          wallet: payment.wallet,
          slot: payment.slot,
          blockTime: payment.blockTime,
          cluster: payment.cluster,
          amountLamports: plan.amountLamports,
          expectedLamports: plan.expectedLamports,
          remainderLamports: plan.remainderLamports,
          ticketCount: plan.ticketCount,
          transactionHash: createTransactionReplayHash(payment),
          ip,
          userAgent,
          result: 'ACCEPTED'
        }
      });

      const purchasedAt = new Date();
      const tickets = await reserveAvailableTickets({
        tx,
        ticketCount: plan.ticketCount,
        payment,
        transactionId: transactionRecord.id,
        purchasedAt
      });

      if (tickets.length !== plan.ticketCount) {
        throw new HttpError(500, 'Atomic purchase failed.');
      }

      await audit('TICKET_PURCHASED', {
        batchId: tickets[0]?.batchId,
        ticketId: tickets[0]?.id,
        wallet: payment.wallet,
        ip,
        signature: payment.signature,
        metadata: {
          slot: payment.slot?.toString(),
          blockTime: payment.blockTime?.toISOString(),
          cluster: payment.cluster,
          amountLamports: plan.amountLamports,
          expectedLamports: plan.expectedLamports,
          remainderLamports: plan.remainderLamports,
          requestedQuantity: plan.requestedQuantity,
          ticketCount: plan.ticketCount,
          userAgent,
          result: 'ACCEPTED'
        }
      }, tx);

      const payload = {
        transaction: transactionRecord,
        tickets: tickets.map((ticket) => publicTicket(ticket, false)),
        quantity: tickets.length
      };

      return plan.ticketCount === 1 ? payload.tickets[0] : payload;
    }, serializableTransactionOptions({ timeout: 60_000 }));
  } catch (error) {
    await audit('PURCHASE_REJECTED', {
      wallet,
      ip,
      signature,
      metadata: {
        cluster,
        quantity,
        userAgent,
        result: 'REJECTED',
        reason: error.message,
        status: error.status
      }
    }).catch(() => undefined);
    mapPurchasePrismaError(error);
  }
}

export async function scratchTicket({ ticketId, wallet, ip }) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new HttpError(404, 'Ticket not found');
    assertTicketIntegrity(ticket);

    if (ticket.buyerWallet !== wallet) {
      throw new HttpError(403, 'Wallet is not the ticket owner');
    }

    if (ticket.status === TICKET_STATUS.SCRATCHED || ticket.status === TICKET_STATUS.PRIZE_PAID) {
      return publicTicket(ticket, true);
    }

    if (ticket.status !== TICKET_STATUS.SOLD) {
      throw new HttpError(409, 'Ticket cannot be scratched in its current status');
    }

    const updatedPayload = {
      ...ticket,
      status: TICKET_STATUS.SCRATCHED,
      scratchedAt: new Date()
    };

    const result = await tx.ticket.updateMany({
      where: { id: ticket.id, status: TICKET_STATUS.SOLD },
      data: {
        status: updatedPayload.status,
        scratchedAt: updatedPayload.scratchedAt,
        hmac: createTicketHmac(updatedPayload)
      }
    });

    if (result.count !== 1) {
      throw new HttpError(409, 'Ticket was already scratched');
    }

    const updatedTicket = await tx.ticket.findUnique({ where: { id: ticket.id } });
    await audit('TICKET_SCRATCHED', {
      ticketId: ticket.id,
      batchId: ticket.batchId,
      wallet,
      ip,
      metadata: { prizeLamports: updatedTicket.prizeLamports.toString() }
    }, tx);

    return publicTicket(updatedTicket, true);
  });
}

export async function getWalletTickets(wallet) {
  await ensureOpenBatch();
  const tickets = await prisma.ticket.findMany({
    where: { buyerWallet: wallet },
    orderBy: { purchasedAt: 'desc' },
    take: 100
  });

  return tickets.map((ticket) => publicTicket(ticket, ticket.status !== TICKET_STATUS.SOLD));
}

export async function getLeaderboard() {
  const tickets = await prisma.ticket.findMany({
    where: {
      prizeLamports: { gt: 0 },
      status: { in: [TICKET_STATUS.SCRATCHED, TICKET_STATUS.PRIZE_PAID] }
    },
    orderBy: { prizeLamports: 'desc' },
    take: 20
  });

  return tickets.map((ticket) => publicTicket(ticket, true));
}

