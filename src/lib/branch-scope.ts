export type BranchContext = { activeBranchId: string | null; grantedBranchIds: readonly string[]; canViewAll: boolean };

export function requireBranchScope(context: BranchContext, requestedBranchId?: string): string | undefined {
  if (!requestedBranchId && context.canViewAll && context.activeBranchId === null) return undefined;
  const branchId = requestedBranchId ?? context.activeBranchId;
  if (!branchId || (!context.canViewAll && !context.grantedBranchIds.includes(branchId))) {
    throw new Error("Branch access denied");
  }
  return branchId;
}
