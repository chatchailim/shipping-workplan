"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth/context";
import { requireAnyRole } from "@/lib/auth/roles";
import { affectsOnHand, canTransitionReturn, RETURN_RESOLUTIONS } from "@/lib/domain/return-workflow";
import { prisma } from "@/lib/prisma";

export type ReturnState = { ok?: boolean; error?: string };

export async function receiveReturnAction(formData: FormData) {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["WAREHOUSE", "BRANCH_ADMIN"]);
  const id = String(formData.get("id"));
  await prisma.$transaction(async (tx) => {
    const item = await tx.return.findFirst({ where: { id, branchId: context.activeBranchId ?? undefined } });
    if (!item || !canTransitionReturn(item.status, "Received")) throw new Error("Return cannot be received in its current status");
    await tx.return.update({ where: { id }, data: { status: "Received" } });
    await tx.auditLog.create({ data: { entityType: "Return", entityId: id, action: "RECEIVE", userId: context.userId, branchId: item.branchId } });
  });
  revalidatePath("/returns");
}

const resolutionSchema = z.object({ id: z.string().min(1), resolution: z.enum(RETURN_RESOLUTIONS), note: z.string().trim().max(300).optional() });

export async function resolveReturnAction(_state: ReturnState, formData: FormData): Promise<ReturnState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["WAREHOUSE", "BRANCH_ADMIN"]);
  const parsed = resolutionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.return.findFirst({ where: { id: parsed.data.id, branchId: context.activeBranchId ?? undefined } });
      if (!item || !canTransitionReturn(item.status, "Resolved")) throw new Error("Only a Received return can be resolved");
      if (affectsOnHand(parsed.data.resolution)) {
        const inventory = await tx.inventory.upsert({
          where: { productId_branchId: { productId: item.productId, branchId: item.branchId } },
          create: { productId: item.productId, branchId: item.branchId, zone: "RETURN-RESTOCK", onHand: item.qty },
          update: { onHand: { increment: item.qty } },
        });
        await tx.stockMovement.create({ data: { inventoryId: inventory.id, type: "Return-In", qty: item.qty, referenceId: item.id, note: parsed.data.note || "Return restocked", createdById: context.userId } });
      }
      await tx.return.update({ where: { id: item.id }, data: { status: "Resolved", resolution: parsed.data.resolution, notes: parsed.data.note || item.notes } });
      await tx.auditLog.create({ data: { entityType: "Return", entityId: item.id, action: `RESOLVE_${parsed.data.resolution.toUpperCase()}`, userId: context.userId, branchId: item.branchId, after: JSON.stringify({ resolution: parsed.data.resolution }) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to resolve return" };
  }
  revalidatePath("/returns"); revalidatePath("/inventory");
  return { ok: true };
}
