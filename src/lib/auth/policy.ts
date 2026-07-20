export const SESSION_TTL_SECONDS = 60 * 60;
export const SESSION_RECHECK_SECONDS = 5 * 60;
export const LOCKOUT_ATTEMPTS = 5;
export const LOCKOUT_SECONDS = 15 * 60;

export function lockoutUntil(failedAttempts: number, now = new Date()): Date | null {
  if (failedAttempts < LOCKOUT_ATTEMPTS) return null;
  return new Date(now.getTime() + LOCKOUT_SECONDS * 1000);
}

export function isLocked(lockedUntil: Date | null, now = new Date()): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}
