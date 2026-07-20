import { describe, expect, it } from "vitest";
import { affectsOnHand, canTransitionReturn } from "./return-workflow";

describe("return workflow", () => {
  it("requires receipt before resolution", () => {
    expect(canTransitionReturn("Pending", "Received")).toBe(true);
    expect(canTransitionReturn("Pending", "Resolved")).toBe(false);
    expect(canTransitionReturn("Received", "Resolved")).toBe(true);
  });
  it("adds stock only for restock resolution", () => {
    expect(affectsOnHand("Restock")).toBe(true);
    expect(affectsOnHand("Scrap")).toBe(false);
    expect(affectsOnHand("Replace")).toBe(false);
  });
});
