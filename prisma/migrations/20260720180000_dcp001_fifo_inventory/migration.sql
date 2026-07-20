CREATE TABLE "OrderAllocation" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "poItemId" TEXT NOT NULL,
  "allocatedQty" DECIMAL(18,3) NOT NULL,
  "allocationSequence" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  "releaseReason" TEXT,
  "createdById" TEXT,
  CONSTRAINT "OrderAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderAllocation_orderId_poItemId_allocationSequence_key" ON "OrderAllocation"("orderId", "poItemId", "allocationSequence");
CREATE INDEX "OrderAllocation_orderId_status_idx" ON "OrderAllocation"("orderId", "status");
CREATE INDEX "OrderAllocation_poItemId_status_idx" ON "OrderAllocation"("poItemId", "status");

CREATE TABLE "InventoryLocationBalance" (
  "id" TEXT NOT NULL,
  "inventoryId" TEXT NOT NULL,
  "zone" TEXT NOT NULL,
  "bin" TEXT,
  "binKey" TEXT NOT NULL DEFAULT '',
  "onHand" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryLocationBalance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryLocationBalance_inventoryId_zone_binKey_key" ON "InventoryLocationBalance"("inventoryId", "zone", "binKey");
CREATE INDEX "InventoryLocationBalance_inventoryId_idx" ON "InventoryLocationBalance"("inventoryId");

CREATE TABLE "BranchFeatureFlag" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BranchFeatureFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BranchFeatureFlag_branchId_key_key" ON "BranchFeatureFlag"("branchId", "key");
CREATE INDEX "BranchFeatureFlag_key_enabled_idx" ON "BranchFeatureFlag"("key", "enabled");
