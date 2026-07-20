"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth/context";
import { requireAnyRole } from "@/lib/auth/roles";

const customerSchema = z.object({
  customerCode: z.string().trim().min(1).max(40),
  companyName: z.string().trim().min(2).max(200),
  paymentTerms: z.string().trim().min(1).max(40),
  contactName: z.string().trim().max(120).optional(),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  phone: z.string().trim().max(40).optional(),
});

export type CustomerState = { ok?: boolean; error?: string };

export async function createCustomerAction(_state: CustomerState, formData: FormData): Promise<CustomerState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["CS", "BRANCH_ADMIN"]);
  if (!context.activeBranchId) return { error: "กรุณาเลือกสาขา" };
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: { ...parsed.data, email: parsed.data.email || null, branchId: context.activeBranchId! } });
      await tx.auditLog.create({ data: { entityType: "Customer", entityId: customer.id, action: "CREATE", userId: context.userId, branchId: context.activeBranchId!, after: JSON.stringify({ customerCode: customer.customerCode, companyName: customer.companyName }) } });
    });
  } catch {
    return { error: "รหัสลูกค้านี้มีอยู่แล้วในสาขา หรือไม่สามารถบันทึกได้" };
  }
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true };
}
