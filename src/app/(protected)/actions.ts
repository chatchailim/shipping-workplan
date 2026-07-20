"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, requireAuthContext } from "@/lib/auth/context";
import { createSession } from "@/lib/auth/session";

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function switchBranchAction(formData: FormData) {
  const context = await requireAuthContext();
  const branchId = String(formData.get("branchId") ?? "");
  if (!context.canViewAll && !context.grantedBranchIds.includes(branchId)) throw new Error("Branch access denied");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: context.userId }, select: { sessionVersion: true } });
  const token = await createSession({ userId: context.userId, sessionVersion: user.sessionVersion, activeBranchId: branchId, roles: context.roles });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 });
  redirect("/dashboard");
}
