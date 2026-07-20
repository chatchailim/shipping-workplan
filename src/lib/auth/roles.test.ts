import { describe, expect, it } from "vitest";
import { hasAnyRole, requireAnyRole } from "./roles";

describe("role authorization", () => {
  it("allows a matching role", () => expect(hasAnyRole(["CS"], ["CS"])).toBe(true));
  it("allows super admin", () => expect(hasAnyRole(["SUPER_ADMIN"], ["WAREHOUSE"])).toBe(true));
  it("rejects a non-matching role", () => expect(() => requireAnyRole(["DRIVER"], ["CS"])).toThrow("Forbidden"));
});
