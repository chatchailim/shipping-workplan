export const ROLES = [
  "SUPER_ADMIN",
  "BRANCH_ADMIN",
  "CS",
  "PURCHASING",
  "LOGISTICS",
  "WAREHOUSE",
  "PRODUCTION",
  "DRIVER",
] as const;

export type Role = (typeof ROLES)[number];

export function hasAnyRole(actual: readonly string[], required: readonly Role[]): boolean {
  return actual.includes("SUPER_ADMIN") || required.some((role) => actual.includes(role));
}

export function requireAnyRole(actual: readonly string[], required: readonly Role[]): void {
  if (!hasAnyRole(actual, required)) throw new Error("Forbidden");
}
