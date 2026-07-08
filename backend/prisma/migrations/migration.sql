-- CreateTable
CREATE TABLE "Batch" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "prizeLamports" BIGINT NOT NULL DEFAULT 0,
    "ticketPriceLamports" BIGINT NOT NULL,
    "publicHash" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "hmac" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchasedAt" TIMESTAMP(3),
    "scratchedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "buyerWallet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "purchaseSignature" TEXT,
    "purchaseSlot" BIGINT,
    "purchaseBlockTime" TIMESTAMP(3),
    "transactionId" UUID,
    "loserMessage" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionRecord" (
    "id" UUID NOT NULL,
    "signature" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "slot" BIGINT,
    "blockTime" TIMESTAMP(3),
    "cluster" TEXT NOT NULL,
    "amountLamports" BIGINT NOT NULL,
    "expectedLamports" BIGINT NOT NULL,
    "remainderLamports" BIGINT NOT NULL DEFAULT 0,
    "ticketCount" INTEGER NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "ticketId" UUID,
    "batchId" UUID,
    "wallet" TEXT,
    "ip" TEXT,
    "signature" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Batch_number_key" ON "Batch"("number");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_publicHash_key" ON "Ticket"("publicHash");

-- CreateIndex
CREATE INDEX "Ticket_transactionId_idx" ON "Ticket"("transactionId");

-- CreateIndex
CREATE INDEX "Ticket_batchNumber_status_idx" ON "Ticket"("batchNumber", "status");

-- CreateIndex
CREATE INDEX "Ticket_buyerWallet_idx" ON "Ticket"("buyerWallet");

-- CreateIndex
CREATE INDEX "Ticket_purchaseSignature_idx" ON "Ticket"("purchaseSignature");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionRecord_signature_key" ON "TransactionRecord"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionRecord_transactionHash_key" ON "TransactionRecord"("transactionHash");

-- CreateIndex
CREATE INDEX "TransactionRecord_wallet_idx" ON "TransactionRecord"("wallet");

-- CreateIndex
CREATE INDEX "TransactionRecord_cluster_slot_idx" ON "TransactionRecord"("cluster", "slot");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_wallet_idx" ON "AuditLog"("wallet");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "TransactionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
