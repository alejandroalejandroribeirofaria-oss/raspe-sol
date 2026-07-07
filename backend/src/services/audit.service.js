import { prisma } from '../config/prisma.js';
import { serializeBigInt } from '../utils/serialize.js';

export async function audit(action, { ticketId, batchId, wallet, ip, signature, metadata } = {}, tx = prisma) {
  return tx.auditLog.create({
    data: {
      action,
      ticketId,
      batchId,
      wallet,
      ip,
      signature,
      metadataJson: metadata ? JSON.stringify(serializeBigInt(metadata)) : undefined
    }
  });
}

