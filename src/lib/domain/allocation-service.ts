import "server-only";

import type { Order, Prisma } from "@prisma/client";
import { buildFifoAllocationPlan, canonicalPoStatus } from "./canonical";

export const FIFO_FEATURE = "DCP001_FIFO";

export async function isFifoEnabled(tx: Prisma.TransactionClient, branchId: string) {
  return (await tx.branchFeatureFlag.findUnique({ where: { branchId_key: { branchId, key: FIFO_FEATURE } } }))?.enabled ?? false;
}

export async function allocateOrderFifo(tx: Prisma.TransactionClient, order: Order, userId: string) {
  const purchaseOrders = await tx.purchaseOrder.findMany({
    where: { branchId: order.branchId, customerId: order.customerId, status: { in: ["Open", "Partially Fulfilled"] } },
    orderBy: [{ poDate: "asc" }, { createdAt: "asc" }],
  });
  const poIds = purchaseOrders.map((po) => po.id);
  const items = await tx.purchaseOrderItem.findMany({ where: { poId: { in: poIds }, productId: order.productId } });
  const active = await tx.orderAllocation.groupBy({ by: ["poItemId"], where: { poItemId: { in: items.map((item) => item.id) }, status: "Active" }, _sum: { allocatedQty: true } });
  const activeMap = new Map(active.map((entry) => [entry.poItemId, Number(entry._sum.allocatedQty ?? 0)]));
  const poMap = new Map(purchaseOrders.map((po) => [po.id, po]));
  const plan = buildFifoAllocationPlan(Number(order.qty), items.map((item) => ({
    poItemId: item.id, poId: item.poId, poDate: poMap.get(item.poId)?.poDate ?? null,
    expectedDeliveryDate: item.expectedDeliveryDate, createdAt: item.createdAt,
    originalQty: Number(item.originalQty), activeAllocatedQty: activeMap.get(item.id) ?? 0,
  })));
  if (!plan.complete) return plan;
  await tx.orderAllocation.createMany({ data: plan.lines.map((line, index) => ({ orderId: order.id, poItemId: line.poItemId, allocatedQty: line.allocatedQty, allocationSequence: index + 1, createdById: userId })) });
  return plan;
}

export async function releaseOrderAllocations(tx: Prisma.TransactionClient, orderId: string, reason: string) {
  return tx.orderAllocation.updateMany({ where: { orderId, status: "Active" }, data: { status: "Released", releasedAt: new Date(), releaseReason: reason } });
}

export async function recalculateAllocatedPurchaseOrders(tx: Prisma.TransactionClient, orderId: string) {
  const related = await tx.orderAllocation.findMany({
    where: { orderId },
    select: { poItemId: true },
  });
  const relatedItems = await tx.purchaseOrderItem.findMany({ where: { id: { in: related.map((row) => row.poItemId) } }, select: { poId: true } });
  const poIds = [...new Set(relatedItems.map((row) => row.poId))];
  for (const poId of poIds) {
    const po = await tx.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } });
    if (!po) continue;
    const items = await tx.purchaseOrderItem.findMany({ where: { poId }, select: { id: true, originalQty: true } });
    const itemIds = items.map((item) => item.id);
    const allocations = await tx.orderAllocation.findMany({
      where: { poItemId: { in: itemIds }, status: "Active" },
      select: { allocatedQty: true, orderId: true },
    });
    const orders = await tx.order.findMany({ where: { id: { in: allocations.map((row) => row.orderId) } }, select: { id: true, status: true } });
    const orderStatus = new Map(orders.map((order) => [order.id, order.status]));
    const originalQty = items.reduce((sum, item) => sum + Number(item.originalQty), 0);
    const allocatedQty = allocations.reduce((sum, row) => sum + Number(row.allocatedQty), 0);
    const deliveredQty = allocations.filter((row) => orderStatus.get(row.orderId) === "Delivered").reduce((sum, row) => sum + Number(row.allocatedQty), 0);
    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: canonicalPoStatus(originalQty, allocatedQty, deliveredQty, po.status === "Closed") },
    });
  }
}
