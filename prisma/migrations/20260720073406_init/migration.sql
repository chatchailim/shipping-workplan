-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "driverId" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "UserRoleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBranch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "UserBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "taxId" TEXT,
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0.07,
    "country" TEXT NOT NULL DEFAULT 'TH',
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerCode" TEXT,
    "companyName" TEXT NOT NULL,
    "address" TEXT,
    "paymentTerms" TEXT NOT NULL DEFAULT 'Net30',
    "defaultDeliveryTime" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "taxId" TEXT,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "erpCode" TEXT NOT NULL,
    "partName" TEXT,
    "sku" TEXT,
    "description" TEXT,
    "partCode" TEXT,
    "customerPN" TEXT,
    "cocNumber" TEXT,
    "boiStatus" TEXT,
    "material" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "dimensions" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "pcsPerPack" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPriceLog" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldPrice" DECIMAL(18,2) NOT NULL,
    "newPrice" DECIMAL(18,2) NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "poNumber" TEXT,

    CONSTRAINT "ProductPriceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "bin" TEXT,
    "onHand" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty" DECIMAL(18,3) NOT NULL,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPlan" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "plannedQty" DECIMAL(18,3) NOT NULL,
    "startDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "poDate" DATE,
    "buyerName" TEXT,
    "buyerEmail" TEXT,
    "buyerPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "soNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "originalQty" DECIMAL(18,3) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "unitPrice" DECIMAL(18,2),
    "expectedDeliveryDate" DATE,
    "deliveryTimeSlot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerPORef" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "poId" TEXT,
    "qty" DECIMAL(18,3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "runNumber" TEXT,
    "orderType" TEXT NOT NULL DEFAULT 'Sales',
    "requiredDate" DATE NOT NULL,
    "shippingTimeSlot" TEXT,
    "notes" TEXT,
    "parentOrderId" TEXT,
    "rootOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRun" (
    "id" TEXT NOT NULL,
    "runNumber" TEXT,
    "branchId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "plannedDate" DATE NOT NULL,
    "departureTime" TEXT,
    "runType" TEXT,
    "noteToDriver" TEXT,
    "noteToCustomer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunNumberCounter" (
    "id" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RunNumberCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRunDriver" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShippingRunDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRunOrder" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stopSequence" INTEGER NOT NULL DEFAULT 0,
    "deliveryTimeOverride" TEXT,
    "inOutSystem" TEXT,
    "note" TEXT,

    CONSTRAINT "ShippingRunOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadKg" DOUBLE PRECISION NOT NULL,
    "volumeM3" DOUBLE PRECISION NOT NULL,
    "vehicleClassId" TEXT,
    "ownership" TEXT NOT NULL DEFAULT 'Owned',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "licenseExpiry" DATE NOT NULL,
    "phone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleClass" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverVehicleClass" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverVehicleClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverVehicleAssignment" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "primaryDriverId" TEXT NOT NULL,
    "secondaryDriverId" TEXT,
    "scheduleType" TEXT NOT NULL,
    "rotationOnDays" INTEGER,
    "rotationOffDays" INTEGER,
    "rotationStartDate" DATE,
    "customWorkingDays" TEXT,
    "runsPerDay" INTEGER NOT NULL DEFAULT 1,
    "run1TimeSlot" TEXT NOT NULL DEFAULT 'Morning',
    "run2TimeSlot" TEXT,
    "run3TimeSlot" TEXT,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverVehicleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverScheduleOverride" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "overrideType" TEXT NOT NULL,
    "substituteDriverId" TEXT,
    "reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverScheduleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "qty" DECIMAL(18,3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "resolution" TEXT,
    "notes" TEXT,
    "driverConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "note" TEXT,
    "before" TEXT,
    "after" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WmsSyncLog" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "sourceFile" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "error" TEXT,

    CONSTRAINT "WmsSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryProof" (
    "id" TEXT NOT NULL,
    "runOrderId" TEXT NOT NULL,
    "imagePath" TEXT,
    "signaturePath" TEXT,
    "recipientName" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedById" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),

    CONSTRAINT "DeliveryProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpExportBatch" (
    "id" TEXT NOT NULL,
    "batchType" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "filePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "branchId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpExportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RmSupplierMapping" (
    "id" TEXT NOT NULL,
    "wmsRmId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "erpRmCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RmSupplierMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RmIssueRecord" (
    "id" TEXT NOT NULL,
    "wmsRmId" TEXT NOT NULL,
    "rollRef" TEXT,
    "qrCode" TEXT,
    "qty" DECIMAL(18,3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "resolvedSupplier" TEXT,
    "erpRmCode" TEXT,
    "exportBatchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RmIssueRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_driverId_key" ON "User"("driverId");

-- CreateIndex
CREATE INDEX "UserRoleEntry_userId_idx" ON "UserRoleEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleEntry_userId_role_key" ON "UserRoleEntry"("userId", "role");

-- CreateIndex
CREATE INDEX "UserBranch_branchId_idx" ON "UserBranch"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBranch_userId_branchId_key" ON "UserBranch"("userId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "Customer_branchId_idx" ON "Customer"("branchId");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_erpCode_key" ON "Product"("erpCode");

-- CreateIndex
CREATE INDEX "Product_branchId_idx" ON "Product"("branchId");

-- CreateIndex
CREATE INDEX "ProductPriceLog_productId_changedAt_idx" ON "ProductPriceLog"("productId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_branchId_key" ON "Inventory"("productId", "branchId");

-- CreateIndex
CREATE INDEX "StockMovement_inventoryId_createdAt_idx" ON "StockMovement"("inventoryId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductionPlan_branchId_dueDate_idx" ON "ProductionPlan"("branchId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_branchId_poNumber_key" ON "PurchaseOrder"("branchId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_poId_productId_idx" ON "PurchaseOrderItem"("poId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_runNumber_key" ON "Order"("runNumber");

-- CreateIndex
CREATE INDEX "Order_branchId_status_requiredDate_idx" ON "Order"("branchId", "status", "requiredDate");

-- CreateIndex
CREATE INDEX "Order_poId_idx" ON "Order"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRun_runNumber_key" ON "ShippingRun"("runNumber");

-- CreateIndex
CREATE INDEX "ShippingRun_branchId_plannedDate_status_idx" ON "ShippingRun"("branchId", "plannedDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RunNumberCounter_yearMonth_key" ON "RunNumberCounter"("yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRunDriver_runId_driverId_key" ON "ShippingRunDriver"("runId", "driverId");

-- CreateIndex
CREATE INDEX "ShippingRunOrder_runId_stopSequence_idx" ON "ShippingRunOrder"("runId", "stopSequence");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRunOrder_runId_orderId_key" ON "ShippingRunOrder"("runId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_branchId_idx" ON "Vehicle"("branchId");

-- CreateIndex
CREATE INDEX "Driver_branchId_idx" ON "Driver"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleClass_code_key" ON "VehicleClass"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DriverVehicleClass_driverId_vehicleClassId_key" ON "DriverVehicleClass"("driverId", "vehicleClassId");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_branchId_active_idx" ON "DriverVehicleAssignment"("branchId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "DriverScheduleOverride_assignmentId_date_key" ON "DriverScheduleOverride"("assignmentId", "date");

-- CreateIndex
CREATE INDEX "Return_branchId_status_idx" ON "Return"("branchId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_branchId_createdAt_idx" ON "AuditLog"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "WmsSyncLog_branchId_startedAt_idx" ON "WmsSyncLog"("branchId", "startedAt");

-- CreateIndex
CREATE INDEX "DeliveryProof_runOrderId_idx" ON "DeliveryProof"("runOrderId");

-- CreateIndex
CREATE INDEX "ErpExportBatch_branchId_batchType_createdAt_idx" ON "ErpExportBatch"("branchId", "batchType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RmSupplierMapping_branchId_wmsRmId_supplierName_key" ON "RmSupplierMapping"("branchId", "wmsRmId", "supplierName");

-- CreateIndex
CREATE INDEX "RmIssueRecord_branchId_status_issuedAt_idx" ON "RmIssueRecord"("branchId", "status", "issuedAt");
