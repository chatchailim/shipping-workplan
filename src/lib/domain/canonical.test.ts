import { describe, expect, it } from "vitest";
import { buildFifoAllocationPlan, canonicalPoStatus, inventoryAvailability, wmsFreshness } from "./canonical";

describe("DCP-001 canonical rules", () => {
  it("allocates FIFO across multiple PO lines deterministically", () => {
    const plan = buildFifoAllocationPlan(8, [
      { poItemId: "new", poId: "PO2", poDate: new Date("2026-02-01"), expectedDeliveryDate: null, createdAt: new Date("2026-01-02"), originalQty: 10, activeAllocatedQty: 0 },
      { poItemId: "old", poId: "PO1", poDate: new Date("2026-01-01"), expectedDeliveryDate: null, createdAt: new Date("2026-01-01"), originalQty: 5, activeAllocatedQty: 1 },
    ]);
    expect(plan.complete).toBe(true);
    expect(plan.lines).toEqual([{ poItemId: "old", poId: "PO1", allocatedQty: 4 }, { poItemId: "new", poId: "PO2", allocatedQty: 4 }]);
  });
  it("reports shortage without claiming a complete plan", () => expect(buildFifoAllocationPlan(5, [{ poItemId: "a", poId: "p", poDate: null, expectedDeliveryDate: null, createdAt: new Date(), originalQty: 2, activeAllocatedQty: 0 }]).shortageQty).toBe(3));
  it("calculates canonical PO states", () => {
    expect(canonicalPoStatus(10, 0, 0)).toBe("Open");
    expect(canonicalPoStatus(10, 3, 0)).toBe("Partially Fulfilled");
    expect(canonicalPoStatus(10, 10, 10)).toBe("Fulfilled");
  });
  it("separates available stock and shortage", () => expect(inventoryAvailability(5, 8)).toEqual({ onHand: 5, reserved: 8, available: 0, shortage: 3 }));
  it("classifies WMS freshness boundaries", () => {
    const now = new Date("2026-07-20T10:00:00Z");
    expect(wmsFreshness(null, now)).toBe("Never synced");
    expect(wmsFreshness(new Date("2026-07-20T09:50:00Z"), now)).toBe("Fresh");
    expect(wmsFreshness(new Date("2026-07-20T09:30:00Z"), now)).toBe("Delayed");
    expect(wmsFreshness(new Date("2026-07-20T08:00:00Z"), now)).toBe("Stale");
  });
});
