import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const roles = ["BRANCH_ADMIN", "CS", "PURCHASING", "LOGISTICS", "WAREHOUSE", "DRIVER"] as const;

function day(offset: number) {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + offset);
  return value;
}

async function main() {
  if (process.env.ALLOW_SYNTHETIC_UAT_SEED !== "true") {
    throw new Error("Refused: set ALLOW_SYNTHETIC_UAT_SEED=true for this synthetic UAT data set");
  }
  const password = process.env.UAT_USER_PASSWORD;
  if (!password || password.length < 12 || password === "change-before-running-seed") {
    throw new Error("UAT_USER_PASSWORD must be a non-default value with at least 12 characters");
  }

  const branch = await prisma.branch.upsert({
    where: { code: "UAT" },
    update: {},
    create: { code: "UAT", name: "Synthetic UAT Branch", country: "TH", currency: "THB", timezone: "Asia/Bangkok", address: "Synthetic data — not a real location" },
  });
  const passwordHash = await hash(password, 12);
  const users = new Map<string, string>();
  for (const role of roles) {
    const email = `${role.toLowerCase().replace("_", "-")}@uat.example.invalid`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { active: true, passwordHash, failedLoginAttempts: 0, lockedUntil: null, sessionVersion: { increment: 1 } },
      create: { name: `UAT ${role}`, email, passwordHash },
    });
    await prisma.userRoleEntry.upsert({ where: { userId_role: { userId: user.id, role } }, update: {}, create: { userId: user.id, role } });
    await prisma.userBranch.upsert({ where: { userId_branchId: { userId: user.id, branchId: branch.id } }, update: {}, create: { userId: user.id, branchId: branch.id } });
    users.set(role, user.id);
  }

  const customer = await prisma.customer.upsert({
    where: { branchId_customerCode: { branchId: branch.id, customerCode: "UAT-CUST-001" } },
    update: {},
    create: { branchId: branch.id, customerCode: "UAT-CUST-001", companyName: "Synthetic Automotive Customer", address: "99 Synthetic Industrial Road", paymentTerms: "Net30", defaultDeliveryTime: "09:00-12:00", contactName: "UAT Contact", phone: "0000000000", email: "customer@uat.example.invalid" },
  });
  const contact = await prisma.customerContact.findFirst({ where: { customerId: customer.id, email: "customer@uat.example.invalid" } });
  if (!contact) await prisma.customerContact.create({ data: { customerId: customer.id, name: "UAT Contact", email: "customer@uat.example.invalid", phone: "0000000000", isDefault: true } });

  const productA = await prisma.product.upsert({
    where: { erpCode: "UAT-FG-001" }, update: {},
    create: { branchId: branch.id, customerId: customer.id, erpCode: "UAT-FG-001", partName: "Synthetic Door Trim A", sku: "UAT-SKU-A", partCode: "PART-A", customerPN: "CUST-PN-A", material: "PP", color: "Black", dimensions: "1000x200x80 mm", weightKg: 2.4, price: 1250, unit: "pcs", pcsPerPack: 10 },
  });
  const productB = await prisma.product.upsert({
    where: { erpCode: "UAT-FG-002" }, update: {},
    create: { branchId: branch.id, customerId: customer.id, erpCode: "UAT-FG-002", partName: "Synthetic Console B", sku: "UAT-SKU-B", partCode: "PART-B", customerPN: "CUST-PN-B", material: "ABS", color: "Gray", dimensions: "600x300x250 mm", weightKg: 3.1, price: 2100, unit: "pcs", pcsPerPack: 5 },
  });

  const vehicleClass = await prisma.vehicleClass.upsert({ where: { code: "UAT-6W" }, update: {}, create: { code: "UAT-6W", name: "Synthetic 6-Wheel Truck", description: "UAT only" } });
  const vehicle = await prisma.vehicle.upsert({ where: { plate: "UAT-DEMO-01" }, update: { active: true }, create: { branchId: branch.id, plate: "UAT-DEMO-01", type: "6-Wheel Truck", payloadKg: 8000, volumeM3: 32, vehicleClassId: vehicleClass.id, ownership: "Owned" } });
  let driver = await prisma.driver.findFirst({ where: { branchId: branch.id, licenseNo: "UAT-LIC-001" } });
  driver ??= await prisma.driver.create({ data: { branchId: branch.id, name: "Synthetic Driver", licenseNo: "UAT-LIC-001", licenseExpiry: day(365), phone: "0000000000" } });
  await prisma.driverVehicleClass.upsert({ where: { driverId_vehicleClassId: { driverId: driver.id, vehicleClassId: vehicleClass.id } }, update: {}, create: { driverId: driver.id, vehicleClassId: vehicleClass.id } });
  const driverUserId = users.get("DRIVER")!;
  await prisma.user.update({ where: { id: driverUserId }, data: { driverId: driver.id } });
  let assignment = await prisma.driverVehicleAssignment.findFirst({ where: { branchId: branch.id, vehicleId: vehicle.id, primaryDriverId: driver.id, active: true } });
  assignment ??= await prisma.driverVehicleAssignment.create({ data: { branchId: branch.id, vehicleId: vehicle.id, primaryDriverId: driver.id, scheduleType: "Daily", runsPerDay: 1, run1TimeSlot: "Morning", effectiveFrom: day(-30), active: true } });

  async function ensurePo(poNumber: string, poDateOffset: number, productId: string, qty: number, price: number) {
    const po = await prisma.purchaseOrder.upsert({ where: { branchId_poNumber: { branchId: branch.id, poNumber } }, update: {}, create: { branchId: branch.id, customerId: customer.id, poNumber, poDate: day(poDateOffset), buyerName: "Synthetic Buyer", buyerEmail: "buyer@uat.example.invalid", status: "Open", notes: "Synthetic UAT data" } });
    let item = await prisma.purchaseOrderItem.findFirst({ where: { poId: po.id, productId } });
    item ??= await prisma.purchaseOrderItem.create({ data: { poId: po.id, productId, originalQty: qty, unit: "pcs", unitPrice: price, expectedDeliveryDate: day(7), deliveryTimeSlot: "Morning" } });
    return { po, item };
  }
  const first = await ensurePo("UAT-PO-001", -14, productA.id, 60, 1250);
  const second = await ensurePo("UAT-PO-002", -7, productA.id, 50, 1250);
  const third = await ensurePo("UAT-PO-003", -3, productB.id, 30, 2100);

  async function ensureOrder(ref: string, productId: string, poId: string | null, qty: number, status: string, offset: number, runNumber?: string) {
    let order = await prisma.order.findFirst({ where: { branchId: branch.id, customerPORef: ref, productId } });
    order ??= await prisma.order.create({ data: { branchId: branch.id, customerId: customer.id, customerPORef: ref, productId, poId, qty, status, priority: status === "Draft" ? "Normal" : "High", runNumber, requiredDate: day(offset), shippingTimeSlot: "Morning", notes: "Synthetic UAT scenario" } });
    return order;
  }
  await ensureOrder("UAT-CPO-DRAFT", productA.id, first.po.id, 20, "Draft", 10);
  const fifoOrder = await ensureOrder("UAT-CPO-FIFO", productA.id, null, 70, "Confirmed", 5, "SP-UAT-0001");
  const readyOrder = await ensureOrder("UAT-CPO-READY", productB.id, third.po.id, 15, "Ready to Ship", 2, "SP-UAT-0002");
  await prisma.orderAllocation.upsert({ where: { orderId_poItemId_allocationSequence: { orderId: fifoOrder.id, poItemId: first.item.id, allocationSequence: 1 } }, update: {}, create: { orderId: fifoOrder.id, poItemId: first.item.id, allocatedQty: 60, allocationSequence: 1, createdById: users.get("CS") } });
  await prisma.orderAllocation.upsert({ where: { orderId_poItemId_allocationSequence: { orderId: fifoOrder.id, poItemId: second.item.id, allocationSequence: 2 } }, update: {}, create: { orderId: fifoOrder.id, poItemId: second.item.id, allocatedQty: 10, allocationSequence: 2, createdById: users.get("CS") } });
  await prisma.orderAllocation.upsert({ where: { orderId_poItemId_allocationSequence: { orderId: readyOrder.id, poItemId: third.item.id, allocationSequence: 1 } }, update: {}, create: { orderId: readyOrder.id, poItemId: third.item.id, allocatedQty: 15, allocationSequence: 1, createdById: users.get("CS") } });
  await prisma.purchaseOrder.update({ where: { id: first.po.id }, data: { status: "Partially Fulfilled" } });
  await prisma.purchaseOrder.update({ where: { id: second.po.id }, data: { status: "Partially Fulfilled" } });
  await prisma.purchaseOrder.update({ where: { id: third.po.id }, data: { status: "Partially Fulfilled" } });

  for (const [product, onHand] of [[productA, 80], [productB, 20]] as const) {
    const inventory = await prisma.inventory.upsert({ where: { productId_branchId: { productId: product.id, branchId: branch.id } }, update: {}, create: { productId: product.id, branchId: branch.id, zone: "MAIN", bin: "A-01", onHand } });
    await prisma.inventoryLocationBalance.upsert({ where: { inventoryId_zone_binKey: { inventoryId: inventory.id, zone: "MAIN", binKey: "A-01" } }, update: {}, create: { inventoryId: inventory.id, zone: "MAIN", bin: "A-01", binKey: "A-01", onHand, source: "SyntheticUAT", sourceUpdatedAt: new Date() } });
    const movement = await prisma.stockMovement.findFirst({ where: { inventoryId: inventory.id, referenceId: `UAT-OPENING-${product.erpCode}` } });
    if (!movement) await prisma.stockMovement.create({ data: { inventoryId: inventory.id, type: "Opening", qty: onHand, referenceId: `UAT-OPENING-${product.erpCode}`, note: "Synthetic opening balance", createdById: users.get("WAREHOUSE") } });
  }
  await prisma.branchFeatureFlag.upsert({ where: { branchId_key: { branchId: branch.id, key: "DCP001_FIFO" } }, update: { enabled: true }, create: { branchId: branch.id, key: "DCP001_FIFO", enabled: true } });
  const sync = await prisma.wmsSyncLog.findFirst({ where: { branchId: branch.id, sourceFile: "synthetic-uat-seed" } });
  const syncCompletedAt = new Date();
  if (sync) {
    await prisma.wmsSyncLog.update({
      where: { id: sync.id },
      data: { startedAt: syncCompletedAt, completedAt: syncCompletedAt, rowCount: 2, status: "Completed" },
    });
  } else {
    await prisma.wmsSyncLog.create({ data: { branchId: branch.id, mode: "Synthetic", sourceFile: "synthetic-uat-seed", startedAt: syncCompletedAt, completedAt: syncCompletedAt, rowCount: 2, status: "Completed" } });
  }

  const run = await prisma.shippingRun.upsert({ where: { runNumber: "DP-UAT-0001" }, update: {}, create: { runNumber: "DP-UAT-0001", branchId: branch.id, vehicleId: vehicle.id, plannedDate: day(2), departureTime: "08:00", runType: "Delivery", status: "Planned", noteToDriver: "Synthetic UAT run" } });
  await prisma.shippingRunDriver.upsert({ where: { runId_driverId: { runId: run.id, driverId: driver.id } }, update: {}, create: { runId: run.id, driverId: driver.id, isPrimary: true } });
  await prisma.shippingRunOrder.upsert({ where: { runId_orderId: { runId: run.id, orderId: readyOrder.id } }, update: {}, create: { runId: run.id, orderId: readyOrder.id, stopSequence: 1, deliveryTimeOverride: "09:00-12:00", note: "Synthetic customer stop" } });

  console.log(JSON.stringify({ branch: "UAT", users: roles.map((role) => `${role.toLowerCase().replace("_", "-")}@uat.example.invalid`), customer: customer.customerCode, products: [productA.erpCode, productB.erpCode], purchaseOrders: [first.po.poNumber, second.po.poNumber, third.po.poNumber], orders: ["UAT-CPO-DRAFT", "UAT-CPO-FIFO", "UAT-CPO-READY"], run: run.runNumber }, null, 2));
}

main().finally(() => prisma.$disconnect());
