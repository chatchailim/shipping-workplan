import { describe, expect, it } from "vitest";
import { requireBranchScope } from "./branch-scope";

describe("branch scope", () => {
  it("allows a granted branch", () => expect(requireBranchScope({ activeBranchId: "A", grantedBranchIds: ["A"], canViewAll: false })).toBe("A"));
  it("rejects an ungranted branch", () => expect(() => requireBranchScope({ activeBranchId: "B", grantedBranchIds: ["A"], canViewAll: false })).toThrow("Branch access denied"));
  it("supports all branches for privileged roles", () => expect(requireBranchScope({ activeBranchId: null, grantedBranchIds: [], canViewAll: true })).toBeUndefined());
});
