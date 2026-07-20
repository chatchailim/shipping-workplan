"use server";

import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/auth/context";
import { createSession } from "@/lib/auth/session";
import { isLocked, lockoutUntil } from "@/lib/auth/policy";

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) });

export type LoginState = { error?: string };

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง" };

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  const genericError = { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  if (!user || !user.active || isLocked(user.lockedUntil)) return genericError;

  const valid = await compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts, lockedUntil: lockoutUntil(failedLoginAttempts) },
    });
    return genericError;
  }

  const [roles, grants] = await Promise.all([
    prisma.userRoleEntry.findMany({ where: { userId: user.id }, select: { role: true } }),
    prisma.userBranch.findMany({ where: { userId: user.id }, select: { branchId: true } }),
  ]);
  if (roles.length === 0) return { error: "บัญชียังไม่ได้รับบทบาท กรุณาติดต่อผู้ดูแลระบบ" };

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  const token = await createSession({
    userId: user.id,
    sessionVersion: user.sessionVersion,
    activeBranchId: grants[0]?.branchId,
    roles: roles.map((entry) => entry.role),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  redirect("/dashboard");
}
