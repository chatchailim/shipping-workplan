"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth/context";
import { requireAnyRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type PoState = { ok?: boolean; error?: string };

const lineSchema = z.object({
  productId: z.string().min(1),
  originalQty: z.coerce.number().positive(),
  unit: z.string().trim().min(1),
  unitPrice: z.coerce.number().nonnegative(),
  expectedDeliveryDate: z.union([z.coerce.date(), z.literal("")]).optional(),
  deliveryTimeSlot: z.string().optional(),
});
const createSchema = lineSchema.extend({
  poNumber: z.string().trim().min(1),
  customerId: z.string().min(1),
  poDate: z.coerce.date(),
});
const addItemSchema = lineSchema.extend({ poId: z.string().min(1) });

export async function createPoAction(_state: PoState, formData: FormData): Promise<PoState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["CS", "PURCHASING", "BRANCH_ADMIN"]);
  if (!context.activeBranchId) return { error: "Please select a branch" };
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { productId, originalQty, unit, unitPrice, expectedDeliveryDate, deliveryTimeSlot, ...header } = parsed.data;
  const [customer, product] = await Promise.all([
    prisma.customer.findFirst({ where: { id: header.customerId, branchId: context.activeBranchId } }),
    prisma.product.findFirst({ where: { id: productId, branchId: context.activeBranchId, active: true } }),
  ]);
  if (!customer || !product) return { error: "Customer or product is not available in the selected branch" };

  try {
    await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({ data: { ...header, branchId: context.activeBranchId! } });
      await createLineAndDraft(tx, {
        poId: po.id,
        customerId: po.customerId,
        poNumber: po.poNumber,
        branchId: context.activeBranchId!,
        productId,
        originalQty,
        unit,
        unitPrice,
        expectedDeliveryDate,
        deliveryTimeSlot,
      });
      await tx.auditLog.create({ data: { entityType: "PurchaseOrder", entityId: po.id, action: "CREATE", userId: context.userId, branchId: context.activeBranchId! } });
    });
  } catch {
    return { error: "PO number already exists in this branch or the data is invalid" };
  }
  revalidatePath("/purchase-orders");
  revalidatePath("/orders");
  return { ok: true };
}

export async function addPoItemAction(_state: PoState, formData: FormData): Promise<PoState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["CS", "PURCHASING", "BRANCH_ADMIN"]);
  if (!context.activeBranchId) return { error: "Please select a branch" };
  const parsed = addItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { poId, ...line } = parsed.data;
  const [po, product] = await Promise.all([
    prisma.purchaseOrder.findFirst({ where: { id: poId, branchId: context.activeBranchId, status: { in: ["Open", "Partially Fulfilled"] } } }),
    prisma.product.findFirst({ where: { id: line.productId, branchId: context.activeBranchId, active: true } }),
  ]);
  if (!po || !product) return { error: "PO or product is not available in the selected branch" };

  await prisma.$transaction(async (tx) => {
    await createLineAndDraft(tx, {
      ...line,
      poId,
      customerId: po.customerId,
      poNumber: po.poNumber,
      branchId: context.activeBranchId!,
    });
    await tx.auditLog.create({
      data: {
        entityType: "PurchaseOrder",
        entityId: poId,
        action: "ADD_ITEM",
        userId: context.userId,
        branchId: context.activeBranchId!,
        after: JSON.stringify({ productId: line.productId, originalQty: line.originalQty }),
      },
    });
  });
  revalidatePath("/purchase-orders");
  revalidatePath("/orders");
  return { ok: true };
}

type Transaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type LineInput = z.output<typeof lineSchema> & { poId: string; customerId: string; poNumber: string; branchId: string };

async function createLineAndDraft(tx: Transaction, input: LineInput) {
  await tx.purchaseOrderItem.create({
    data: {
      poId: input.poId,
      productId: input.productId,
      originalQty: input.originalQty,
      unit: input.unit,
      unitPrice: input.unitPrice,
      expectedDeliveryDate: input.expectedDeliveryDate || null,
      deliveryTimeSlot: input.deliveryTimeSlot || null,
    },
  });
  if (input.expectedDeliveryDate) {
    await tx.order.create({
      data: {
        customerId: input.customerId,
        customerPORef: input.poNumber,
        productId: input.productId,
        branchId: input.branchId,
        poId: input.poId,
        qty: input.originalQty,
        status: "Draft",
        requiredDate: input.expectedDeliveryDate,
        shippingTimeSlot: input.deliveryTimeSlot || null,
      },
    });
  }
}
