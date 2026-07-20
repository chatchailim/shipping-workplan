import { describe, expect, it } from "vitest";
import { isLocked, lockoutUntil } from "./policy";

describe("login lockout", () => {
  const now = new Date("2026-07-20T00:00:00Z");
  it("does not lock before five failures", () => expect(lockoutUntil(4, now)).toBeNull());
  it("locks for 15 minutes on the fifth failure", () => expect(lockoutUntil(5, now)?.toISOString()).toBe("2026-07-20T00:15:00.000Z"));
  it("expires at the boundary", () => expect(isLocked(new Date("2026-07-20T00:15:00Z"), new Date("2026-07-20T00:15:00Z"))).toBe(false));
});
