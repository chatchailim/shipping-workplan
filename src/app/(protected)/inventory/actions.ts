"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth/context";
import { requireAnyRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type InventoryState = { ok?: boolean; error?: string };
const movementSchema = z.object({ productId: z.string().min(1), type: z.enum(["Inbound", "Outbound", "Adjustment-In", "Adjustment-Out"]), qty: z.coerce.number().positive(), zone: z.string().trim().min(1).max(40), referenceId: z.string().trim().max(80).optional(), note: z.string().trim().min(3).max(300) });

export async function createMovementAction(_state: InventoryState, formData: FormData): Promise<InventoryState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["WAREHOUSE", "BRANCH_ADMIN"]);
  if (!context.activeBranchId) return { error: "Please select a branch" };
  const parsed = movementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const product = await prisma.product.findFirst({ where: { id: parsed.data.productId, branchId: context.activeBranchId, active: true } });
  if (!product) return { error: "Product is unavailable in this branch" };
  const incoming = ["Inbound", "Adjustment-In"].includes(parsed.data.type);
  try {
    await prisma.$transaction(async (tx) => {
      let inventory = await tx.inventory.findUnique({ where: { productId_branchId: { productId: product.id, branchId: context.activeBranchId! } } });
      if (!inventory) {
        if (!incoming) throw new Error("Cannot issue stock before an inventory record exists");
        inventory = await tx.inventory.create({ data: { productId: product.id, branchId: context.activeBranchId!, zone: parsed.data.zone, onHand: 0 } });
      }
      const current = Number(inventory.onHand);
      if (!incoming && parsed.data.qty > current) throw new Error("Insufficient on-hand quantity");
      const signedQty = incoming ? parsed.data.qty : -parsed.data.qty;
      const location = await tx.inventoryLocationBalance.findUnique({ where: { inventoryId_zone_binKey: { inventoryId: inventory.id, zone: parsed.data.zone, binKey: "" } } });
      if (!incoming && (!location || parsed.data.qty > Number(location.onHand))) throw new Error("Insufficient on-hand quantity in the selected zone");
      await tx.inventory.update({ where: { id: inventory.id }, data: { onHand: { increment: signedQty }, zone: parsed.data.zone } });
      await tx.inventoryLocationBalance.upsert({
        where: { inventoryId_zone_binKey: { inventoryId: inventory.id, zone: parsed.data.zone, binKey: "" } },
        create: { inventoryId: inventory.id, zone: parsed.data.zone, binKey: "", onHand: signedQty, source: "Manual" },
        update: { onHand: { increment: signedQty }, source: "Manual", sourceUpdatedAt: new Date() },
      });
      const movement = await tx.stockMovement.create({ data: { inventoryId: inventory.id, type: parsed.data.type, qty: new Prisma.Decimal(signedQty), referenceId: parsed.data.referenceId || null, note: parsed.data.note, createdById: context.userId } });
      await tx.auditLog.create({ data: { entityType: "StockMovement", entityId: movement.id, action: "CREATE", userId: context.userId, branchId: context.activeBranchId!, after: JSON.stringify({ type: parsed.data.type, qty: signedQty }) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create stock movement" };
  }
  revalidatePath("/inventory");
  return { ok: true };
}
