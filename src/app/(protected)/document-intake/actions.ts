"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth/context";
import { requireAnyRole } from "@/lib/auth/roles";
import { diffPurchaseOrder, type RevisionSnapshot } from "@/lib/domain/revision";
import { prisma } from "@/lib/prisma";

export type IntakeState = { ok?: boolean; error?: string; message?: string };

const intakeSchema = z.object({
  channel: z.enum(["GMAIL", "LINE", "MANUAL_UPLOAD"]), sourceRef: z.string().trim().optional(),
  sourceFileName: z.string().trim().optional(), sender: z.string().trim().optional(), checksum: z.string().trim().optional(),
  poNumber: z.string().trim().min(1), customerId: z.string().min(1), poDate: z.coerce.date(), notes: z.string().trim().optional(),
  productId: z.string().min(1), originalQty: z.coerce.number().positive(), unit: z.string().trim().min(1),
  unitPrice: z.coerce.number().nonnegative(), expectedDeliveryDate: z.union([z.coerce.date(), z.literal("")]).optional(),
  deliveryTimeSlot: z.string().optional(),
});

function isoDate(value: Date | null | undefined) { return value ? value.toISOString().slice(0, 10) : null; }

export async function ingestDocumentAction(_state: IntakeState, formData: FormData): Promise<IntakeState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["CS", "PURCHASING", "BRANCH_ADMIN"]);
  if (!context.activeBranchId) return { error: "Please select a branch" };
  const parsed = intakeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const input = parsed.data;
  const [customer, product] = await Promise.all([
    prisma.customer.findFirst({ where: { id: input.customerId, branchId: context.activeBranchId } }),
    prisma.product.findFirst({ where: { id: input.productId, branchId: context.activeBranchId, active: true } }),
  ]);
  if (!customer || !product) return { error: "Customer or product is not available in this branch" };

  const proposed: RevisionSnapshot = { poDate: isoDate(input.poDate), notes: input.notes || null, items: [{
    productId: input.productId, originalQty: input.originalQty, unit: input.unit, unitPrice: input.unitPrice,
    expectedDeliveryDate: input.expectedDeliveryDate instanceof Date ? isoDate(input.expectedDeliveryDate) : null,
    deliveryTimeSlot: input.deliveryTimeSlot || null,
  }] };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const document = await tx.inboundDocument.create({ data: {
        branchId: context.activeBranchId!, channel: input.channel, sourceRef: input.sourceRef || null,
        sourceFileName: input.sourceFileName || null, sender: input.sender || null, checksum: input.checksum || null,
        status: "ExtractedDraft", extractionData: JSON.stringify({ poNumber: input.poNumber, customerId: input.customerId, ...proposed }),
        extractionNote: "Human-entered extraction; connector/AI adapter pending", createdById: context.userId,
      } });
      const existing = await tx.purchaseOrder.findUnique({ where: { branchId_poNumber: { branchId: context.activeBranchId!, poNumber: input.poNumber } } });
      if (!existing) {
        const po = await tx.purchaseOrder.create({ data: { poNumber: input.poNumber, customerId: input.customerId, branchId: context.activeBranchId!, poDate: input.poDate, notes: input.notes || null } });
        const line = proposed.items[0];
        await tx.purchaseOrderItem.create({ data: { poId: po.id, productId: line.productId, originalQty: line.originalQty, unit: line.unit, unitPrice: line.unitPrice, expectedDeliveryDate: line.expectedDeliveryDate ? new Date(`${line.expectedDeliveryDate}T00:00:00.000Z`) : null, deliveryTimeSlot: line.deliveryTimeSlot } });
        if (line.expectedDeliveryDate) await tx.order.create({ data: { customerId: input.customerId, customerPORef: input.poNumber, productId: line.productId, branchId: context.activeBranchId!, poId: po.id, qty: line.originalQty, status: "Draft", requiredDate: new Date(`${line.expectedDeliveryDate}T00:00:00.000Z`), shippingTimeSlot: line.deliveryTimeSlot } });
        await tx.inboundDocument.update({ where: { id: document.id }, data: { status: "CSApproved" } });
        await tx.auditLog.create({ data: { entityType: "PurchaseOrder", entityId: po.id, action: "CREATE_FROM_INTAKE", userId: context.userId, branchId: context.activeBranchId!, after: JSON.stringify(proposed) } });
        return "Created a new PO and Draft Order";
      }
      const items = await tx.purchaseOrderItem.findMany({ where: { poId: existing.id } });
      const current: RevisionSnapshot = { poDate: isoDate(existing.poDate), notes: existing.notes, items: items.map((line) => ({ productId: line.productId, originalQty: Number(line.originalQty), unit: line.unit, unitPrice: line.unitPrice === null ? null : Number(line.unitPrice), expectedDeliveryDate: isoDate(line.expectedDeliveryDate), deliveryTimeSlot: line.deliveryTimeSlot })) };
      const changes = diffPurchaseOrder(current, proposed);
      if (changes.length === 0) {
        await tx.inboundDocument.update({ where: { id: document.id }, data: { status: "DuplicateNoChange" } });
        return "Duplicate document detected; no data changed";
      }
      const last = await tx.purchaseOrderRevision.aggregate({ where: { purchaseOrderId: existing.id }, _max: { revisionNo: true } });
      await tx.purchaseOrderRevision.create({ data: { purchaseOrderId: existing.id, inboundDocumentId: document.id, revisionNo: (last._max.revisionNo ?? 0) + 1, proposedData: JSON.stringify({ customerId: input.customerId, ...proposed }), changeSet: JSON.stringify(changes), createdById: context.userId } });
      await tx.inboundDocument.update({ where: { id: document.id }, data: { status: "RevisionPendingReview" } });
      return `Revision detected with ${changes.length} change(s); CS review required`;
    });
    revalidatePath("/document-intake"); revalidatePath("/purchase-orders"); revalidatePath("/orders");
    return { ok: true, message: result };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unable to ingest document" }; }
}

const decisionSchema = z.object({ id: z.string().min(1), decision: z.enum(["Accepted", "Rejected"]), reason: z.string().trim().optional() });

export async function reviewRevisionAction(formData: FormData) {
  const context = await requireAuthContext(); requireAnyRole(context.roles, ["CS", "BRANCH_ADMIN"]);
  const parsed = decisionSchema.parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    const revision = await tx.purchaseOrderRevision.findFirst({ where: { id: parsed.id, status: "PendingReview" } });
    if (!revision) throw new Error("Pending revision not found");
    const po = await tx.purchaseOrder.findFirst({ where: { id: revision.purchaseOrderId, branchId: context.activeBranchId ?? undefined } });
    if (!po) throw new Error("PO is not available in the active branch");
    if (parsed.decision === "Rejected") {
      if (!parsed.reason) throw new Error("Rejection reason is required");
      await tx.purchaseOrderRevision.update({ where: { id: revision.id }, data: { status: "Rejected", reviewedById: context.userId, reviewedAt: new Date(), rejectionReason: parsed.reason } });
      if (revision.inboundDocumentId) await tx.inboundDocument.update({ where: { id: revision.inboundDocumentId }, data: { status: "RevisionRejected" } });
      return;
    }
    const locked = await tx.order.count({ where: { poId: po.id, status: { notIn: ["Draft", "Cancelled"] } } });
    if (locked) throw new Error("Revision affects confirmed or active delivery work; cancel/escalate those Orders before accepting");
    const proposed = JSON.parse(revision.proposedData) as RevisionSnapshot & { customerId: string };
    await tx.order.deleteMany({ where: { poId: po.id, status: "Draft" } });
    await tx.purchaseOrderItem.deleteMany({ where: { poId: po.id } });
    await tx.purchaseOrder.update({ where: { id: po.id }, data: { customerId: proposed.customerId, poDate: proposed.poDate ? new Date(`${proposed.poDate}T00:00:00.000Z`) : null, notes: proposed.notes } });
    for (const line of proposed.items) {
      await tx.purchaseOrderItem.create({ data: { poId: po.id, productId: line.productId, originalQty: line.originalQty, unit: line.unit, unitPrice: line.unitPrice, expectedDeliveryDate: line.expectedDeliveryDate ? new Date(`${line.expectedDeliveryDate}T00:00:00.000Z`) : null, deliveryTimeSlot: line.deliveryTimeSlot } });
      if (line.expectedDeliveryDate) await tx.order.create({ data: { customerId: proposed.customerId, customerPORef: po.poNumber, productId: line.productId, branchId: po.branchId, poId: po.id, qty: line.originalQty, status: "Draft", requiredDate: new Date(`${line.expectedDeliveryDate}T00:00:00.000Z`), shippingTimeSlot: line.deliveryTimeSlot } });
    }
    await tx.purchaseOrderRevision.update({ where: { id: revision.id }, data: { status: "Accepted", reviewedById: context.userId, reviewedAt: new Date() } });
    if (revision.inboundDocumentId) await tx.inboundDocument.update({ where: { id: revision.inboundDocumentId }, data: { status: "CSApproved" } });
    await tx.auditLog.create({ data: { entityType: "PurchaseOrder", entityId: po.id, action: "ACCEPT_REVISION", userId: context.userId, branchId: po.branchId, before: revision.changeSet, after: revision.proposedData } });
  });
  revalidatePath("/document-intake"); revalidatePath("/purchase-orders"); revalidatePath("/orders");
}

export async function queueErpSubmissionAction(formData: FormData) {
  const context = await requireAuthContext(); requireAnyRole(context.roles, ["CS", "PURCHASING", "BRANCH_ADMIN"]);
  const poId = z.string().min(1).parse(formData.get("poId"));
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, branchId: context.activeBranchId ?? undefined } });
  if (!po) throw new Error("PO not found");
  const items = await prisma.purchaseOrderItem.findMany({ where: { poId } });
  const requestData = JSON.stringify({ poNumber: po.poNumber, customerId: po.customerId, poDate: isoDate(po.poDate), items: items.map((item) => ({ productId: item.productId, qty: Number(item.originalQty), unit: item.unit, unitPrice: item.unitPrice === null ? null : Number(item.unitPrice) })) });
  const idempotencyKey = createHash("sha256").update(`${po.branchId}:${po.id}:${requestData}`).digest("hex");
  await prisma.erpSubmission.upsert({ where: { idempotencyKey }, create: { purchaseOrderId: po.id, idempotencyKey, status: "ManualReview", mode: "PendingContract", requestData, submittedById: context.userId }, update: {} });
  revalidatePath("/document-intake");
}
