"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth/context";
import { requireAnyRole } from "@/lib/auth/roles";
import { issueDailyNumber } from "@/lib/domain/numbering";
import { canTransitionOrder, fitsSplitSource, isValidSplitQuantity } from "@/lib/domain/workflow";
import { prisma } from "@/lib/prisma";

export type OrderState = { ok?: boolean; error?: string };

const createSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  poId: z.string().optional(),
  customerPORef: z.string().trim().min(1),
  qty: z.coerce.number().positive(),
  requiredDate: z.coerce.date(),
  shippingTimeSlot: z.string().optional(),
  priority: z.enum(["Normal", "Urgent", "VIP"]),
});
const amendSchema = z.object({
  id: z.string().min(1),
  qty: z.coerce.number().positive(),
  requiredDate: z.coerce.date(),
  shippingTimeSlot: z.string().optional(),
  priority: z.enum(["Normal", "Urgent", "VIP"]),
});
const splitSchema = z.object({ id: z.string().min(1), firstQty: z.coerce.number().positive() });

export async function createOrderAction(_state: OrderState, formData: FormData): Promise<OrderState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["CS", "BRANCH_ADMIN"]);
  if (!context.activeBranchId) return { error: "Please select a branch" };
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const [customer, product] = await Promise.all([
    prisma.customer.findFirst({ where: { id: parsed.data.customerId, branchId: context.activeBranchId } }),
    prisma.product.findFirst({ where: { id: parsed.data.productId, branchId: context.activeBranchId, active: true } }),
  ]);
  if (!customer || !product) return { error: "Customer or product is not available in this branch" };
  if (parsed.data.poId && !await prisma.purchaseOrder.findFirst({ where: { id: parsed.data.poId, branchId: context.activeBranchId, customerId: parsed.data.customerId } })) {
    return { error: "PO does not belong to the selected customer and branch" };
  }
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: { ...parsed.data, poId: parsed.data.poId || null, shippingTimeSlot: parsed.data.shippingTimeSlot || null, branchId: context.activeBranchId!, status: "Draft" } });
    await tx.auditLog.create({ data: { entityType: "Order", entityId: order.id, action: "CREATE", userId: context.userId, branchId: context.activeBranchId! } });
  });
  revalidatePath("/orders");
  return { ok: true };
}

export async function amendDraftOrderAction(_state: OrderState, formData: FormData): Promise<OrderState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["CS", "BRANCH_ADMIN"]);
  const parsed = amendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { id, ...changes } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, branchId: context.activeBranchId ?? undefined, status: "Draft" } });
      if (!order) throw new Error("Only a Draft order can be amended");
      if (order.parentOrderId) {
        const [source, siblings] = await Promise.all([
          tx.order.findUnique({ where: { id: order.parentOrderId } }),
          tx.order.aggregate({ _sum: { qty: true }, where: { parentOrderId: order.parentOrderId, id: { not: id }, status: { not: "Cancelled" } } }),
        ]);
        if (!source || !fitsSplitSource(Number(source.qty), Number(siblings._sum.qty ?? 0), changes.qty)) {
          throw new Error("Child quantities cannot exceed the source order quantity");
        }
      }
      await tx.order.update({ where: { id }, data: { ...changes, shippingTimeSlot: changes.shippingTimeSlot || null } });
      await tx.auditLog.create({ data: { entityType: "Order", entityId: id, action: "AMEND", userId: context.userId, branchId: order.branchId, before: JSON.stringify({ qty: order.qty.toString(), requiredDate: order.requiredDate }), after: JSON.stringify(changes) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to amend order" };
  }
  revalidatePath("/orders");
  return { ok: true };
}

export async function splitDraftOrderAction(_state: OrderState, formData: FormData): Promise<OrderState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["CS", "BRANCH_ADMIN"]);
  const parsed = splitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: parsed.data.id, branchId: context.activeBranchId ?? undefined, status: "Draft" } });
      if (!order) throw new Error("Only a Draft order can be split");
      const total = Number(order.qty);
      if (!isValidSplitQuantity(total, parsed.data.firstQty)) throw new Error("Split quantity must be smaller than the order quantity");
      const rootOrderId = order.rootOrderId ?? order.id;
      const common = {
        customerId: order.customerId, customerPORef: order.customerPORef, productId: order.productId,
        branchId: order.branchId, poId: order.poId, status: "Draft", priority: order.priority,
        orderType: order.orderType, requiredDate: order.requiredDate, shippingTimeSlot: order.shippingTimeSlot,
        notes: order.notes, parentOrderId: order.id, rootOrderId,
      };
      await tx.order.update({ where: { id: order.id }, data: { status: "Split-shipping", rootOrderId } });
      await tx.order.createMany({ data: [
        { ...common, qty: parsed.data.firstQty },
        { ...common, qty: total - parsed.data.firstQty },
      ] });
      await tx.auditLog.create({ data: { entityType: "Order", entityId: order.id, action: "SPLIT", userId: context.userId, branchId: order.branchId, after: JSON.stringify({ quantities: [parsed.data.firstQty, total - parsed.data.firstQty] }) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to split order" };
  }
  revalidatePath("/orders");
  return { ok: true };
}

export async function cancelOrderAction(formData: FormData) {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["CS", "BRANCH_ADMIN"]);
  const id = String(formData.get("id"));
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id, branchId: context.activeBranchId ?? undefined } });
    if (!order || !canTransitionOrder(order.status, "Cancelled")) throw new Error("Order cannot be cancelled in its current status");
    const assigned = await tx.shippingRunOrder.count({ where: { orderId: id } });
    if (assigned > 0) throw new Error("Remove the order from its delivery run before cancellation");
    await tx.order.update({ where: { id }, data: { status: "Cancelled" } });
    await tx.auditLog.create({ data: { entityType: "Order", entityId: id, action: "CANCEL", userId: context.userId, branchId: order.branchId } });
  });
  revalidatePath("/orders");
  revalidatePath("/purchase-orders");
}

export async function confirmOrderAction(formData: FormData) {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["CS", "BRANCH_ADMIN"]);
  const id = String(formData.get("id"));
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, branchId: context.activeBranchId ?? undefined } });
      if (!order || !canTransitionOrder(order.status, "Confirmed")) throw new Error("Order transition invalid");
      if (!order.poId) {
        await tx.order.update({ where: { id }, data: { status: "Wait-PO" } });
        await tx.auditLog.create({ data: { entityType: "Order", entityId: id, action: "WAIT_PO", userId: context.userId, branchId: order.branchId } });
        return;
      }
      const [contracted, released] = await Promise.all([
        tx.purchaseOrderItem.aggregate({ _sum: { originalQty: true }, where: { poId: order.poId, productId: order.productId } }),
        tx.order.aggregate({ _sum: { qty: true }, where: { poId: order.poId, productId: order.productId, status: { notIn: ["Draft", "Cancelled", "Split-shipping"] }, id: { not: id } } }),
      ]);
      const balance = Number(contracted._sum.originalQty ?? 0) - Number(released._sum.qty ?? 0);
      if (Number(order.qty) > balance) {
        await tx.order.update({ where: { id }, data: { status: "Wait-PO" } });
        await tx.auditLog.create({ data: { entityType: "Order", entityId: id, action: "WAIT_PO", userId: context.userId, branchId: order.branchId } });
        return;
      }
      const runNumber = await issueDailyNumber(tx, "SP", new Date());
      await tx.order.update({ where: { id }, data: { status: "Confirmed", runNumber } });
      await tx.auditLog.create({ data: { entityType: "Order", entityId: id, action: "CONFIRM", userId: context.userId, branchId: order.branchId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    throw new Error("Unable to confirm order; check the PO balance");
  }
  revalidatePath("/orders");
  revalidatePath("/dashboard");
}

export async function readyOrderAction(formData: FormData) {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["CS", "WAREHOUSE", "BRANCH_ADMIN"]);
  const id = String(formData.get("id"));
  const order = await prisma.order.findFirst({ where: { id, branchId: context.activeBranchId ?? undefined } });
  if (!order || !canTransitionOrder(order.status, "Ready to Ship")) throw new Error("Order transition invalid");
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status: "Ready to Ship" } });
    await tx.auditLog.create({ data: { entityType: "Order", entityId: id, action: "READY", userId: context.userId, branchId: order.branchId } });
  });
  revalidatePath("/orders");
}
