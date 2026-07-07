import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/prisma.js';
import { purchaseTicket } from '../src/services/ticket.service.js';

const WALLET = '11111111111111111111111111111111';

async function resetDb() {
  await prisma.auditLog.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.transactionRecord.deleteMany();
  await prisma.batch.deleteMany();
}

test('repeated signature cannot issue two tickets', async () => {
  await resetDb();
  const signature = 'a'.repeat(88);
  const first = await purchaseTicket({ wallet: WALLET, signature, cluster: 'devnet' });
  assert.ok(first.id);

  await assert.rejects(
    () => purchaseTicket({ wallet: WALLET, signature, cluster: 'devnet' }),
    /Transaction already used/
  );

  const count = await prisma.transactionRecord.count({ where: { purchaseSignature: signature } });
  assert.equal(count, 1);
});

test('simultaneous purchases with the same signature produce a single success', async () => {
  await resetDb();
  const signature = 'b'.repeat(88);
  const results = await Promise.allSettled([
    purchaseTicket({ wallet: WALLET, signature, cluster: 'devnet' }),
    purchaseTicket({ wallet: WALLET, signature, cluster: 'devnet' })
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(await prisma.transactionRecord.count({ where: { purchaseSignature: signature } }), 1);
  assert.equal(await prisma.ticket.count({ where: { purchaseSignature: signature } }), 1);
});

test('rollback leaves no payment record when ticket reservation fails', async () => {
  await resetDb();
  await assert.rejects(
    () => purchaseTicket({
      wallet: WALLET,
      signature: 'c'.repeat(88),
      cluster: 'devnet',
      quantity: 2
    }),
    /Insufficient payment/
  );

  assert.equal(await prisma.transactionRecord.count(), 0);
  assert.equal(await prisma.ticket.count({ where: { status: 'SOLD' } }), 0);
});

