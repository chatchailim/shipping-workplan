import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "./session";

export const SESSION_COOKIE = "swp_session";

export type AuthContext = {
  userId: string;
  name: string;
  email: string;
  driverId: string | null;
  roles: string[];
  grantedBranchIds: string[];
  activeBranchId: string | null;
  canViewAll: boolean;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const claims = await verifySession(token);
    const [user, roles, grants] = await Promise.all([
      prisma.user.findUnique({ where: { id: claims.userId } }),
      prisma.userRoleEntry.findMany({ where: { userId: claims.userId }, select: { role: true } }),
      prisma.userBranch.findMany({ where: { userId: claims.userId }, select: { branchId: true } }),
    ]);
    if (!user?.active || user.sessionVersion !== claims.sessionVersion) return null;
    const currentRoles = roles.map((entry) => entry.role);
    const grantedBranchIds = grants.map((entry) => entry.branchId);
    const canViewAll = currentRoles.includes("SUPER_ADMIN");
    const requestedBranch = claims.activeBranchId ?? null;
    const activeBranchId = requestedBranch && (canViewAll || grantedBranchIds.includes(requestedBranch))
      ? requestedBranch
      : (grantedBranchIds[0] ?? null);
    return { userId: user.id, name: user.name, email: user.email, driverId: user.driverId, roles: currentRoles, grantedBranchIds, activeBranchId, canViewAll };
  } catch {
    return null;
  }
}

export async function requireAuthContext(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  return context;
}
