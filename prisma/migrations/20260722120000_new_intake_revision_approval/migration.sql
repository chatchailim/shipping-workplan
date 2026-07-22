CREATE TABLE "InboundDocument" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "sourceRef" TEXT,
  "sourceFileName" TEXT,
  "storagePath" TEXT,
  "checksum" TEXT,
  "sender" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Received',
  "extractionData" TEXT,
  "extractionNote" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InboundDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InboundDocument_branchId_checksum_key" ON "InboundDocument"("branchId", "checksum");
CREATE INDEX "InboundDocument_branchId_status_createdAt_idx" ON "InboundDocument"("branchId", "status", "createdAt");

CREATE TABLE "PurchaseOrderRevision" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "inboundDocumentId" TEXT,
  "revisionNo" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PendingReview',
  "proposedData" TEXT NOT NULL,
  "changeSet" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrderRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseOrderRevision_purchaseOrderId_revisionNo_key" ON "PurchaseOrderRevision"("purchaseOrderId", "revisionNo");
CREATE INDEX "PurchaseOrderRevision_purchaseOrderId_status_idx" ON "PurchaseOrderRevision"("purchaseOrderId", "status");
CREATE INDEX "PurchaseOrderRevision_inboundDocumentId_idx" ON "PurchaseOrderRevision"("inboundDocumentId");

ALTER TABLE "ShippingRun" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'Draft';
ALTER TABLE "ShippingRun" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "ShippingRun" ADD COLUMN "approvedAt" TIMESTAMP(3);

CREATE TABLE "ErpSubmission" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'PendingContract',
  "status" TEXT NOT NULL DEFAULT 'Queued',
  "soNumber" TEXT,
  "requestData" TEXT NOT NULL,
  "responseData" TEXT,
  "errorMessage" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "submittedById" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ErpSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ErpSubmission_idempotencyKey_key" ON "ErpSubmission"("idempotencyKey");
CREATE INDEX "ErpSubmission_purchaseOrderId_status_idx" ON "ErpSubmission"("purchaseOrderId", "status");
