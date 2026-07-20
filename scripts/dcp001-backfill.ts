import { PrismaClient } from "@prisma/client";
import { buildFifoAllocationPlan } from "../src/lib/domain/canonical";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const enableBb = process.argv.includes("--enable-bb");

async function main() {
  const orders = await prisma.order.findMany({ where: { poId: { not: null }, status: { notIn: ["Draft", "Cancelled", "Split-shipping", "Delivery Failed"] } } });
  const existingOrderIds = new Set((await prisma.orderAllocation.findMany({ select: { orderId: true }, distinct: ["orderId"] })).map((item) => item.orderId));
  const allocations: Array<{ orderId: string; poItemId: string; allocatedQty: number; allocationSequence: number; status: string }> = [];
  const conflicts: Array<{ orderId: string; reason: string }> = [];

  for (const order of orders.filter((item) => !existingOrderIds.has(item.id))) {
    const items = await prisma.purchaseOrderItem.findMany({ where: { poId: order.poId!, productId: order.productId }, orderBy: [{ expectedDeliveryDate: "asc" }, { createdAt: "asc" }] });
    const active = await prisma.orderAllocation.groupBy({ by: ["poItemId"], where: { poItemId: { in: items.map((item) => item.id) }, status: "Active" }, _sum: { allocatedQty: true } });
    const activeMap = new Map(active.map((item) => [item.poItemId, Number(item._sum.allocatedQty ?? 0)]));
    const po = await prisma.purchaseOrder.findUnique({ where: { id: order.poId! } });
    const plan = buildFifoAllocationPlan(Number(order.qty), items.map((item) => ({ poItemId: item.id, poId: item.poId, poDate: po?.poDate ?? null, expectedDeliveryDate: item.expectedDeliveryDate, createdAt: item.createdAt, originalQty: Number(item.originalQty), activeAllocatedQty: activeMap.get(item.id) ?? 0 })));
    if (!plan.complete) { conflicts.push({ orderId: order.id, reason: `shortage ${plan.shortageQty}` }); continue; }
    allocations.push(...plan.lines.map((line, index) => ({ orderId: order.id, poItemId: line.poItemId, allocatedQty: line.allocatedQty, allocationSequence: index + 1, status: "Active" })));
  }

  const inventories = await prisma.inventory.findMany();
  const existingLocations = new Set((await prisma.inventoryLocationBalance.findMany({ select: { inventoryId: true } })).map((item) => item.inventoryId));
  const locations = inventories.filter((item) => !existingLocations.has(item.id)).map((item) => ({ inventoryId: item.id, zone: item.zone || "LEGACY", bin: item.bin, binKey: item.bin ?? "", onHand: item.onHand, source: "Legacy" }));

  const report = { mode: apply ? "apply" : "dry-run", candidateOrders: orders.length, allocationRows: allocations.length, conflicts, locationRows: locations.length, enableBb };
  if (apply) {
    await prisma.$transaction(async (tx) => {
      if (allocations.length) await tx.orderAllocation.createMany({ data: allocations });
      if (locations.length) await tx.inventoryLocationBalance.createMany({ data: locations });
      if (enableBb) {
        const branch = await tx.branch.findUnique({ where: { code: "BB" } });
        if (!branch) throw new Error("BB branch not found");
        await tx.branchFeatureFlag.upsert({ where: { branchId_key: { branchId: branch.id, key: "DCP001_FIFO" } }, create: { branchId: branch.id, key: "DCP001_FIFO", enabled: true }, update: { enabled: true } });
      }
    });
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().finally(() => prisma.$disconnect());
