import { describe, expect, it } from "vitest";
import { diffPurchaseOrder, type RevisionSnapshot } from "./revision";

const base: RevisionSnapshot = { poDate: "2026-07-22", notes: null, items: [{ productId: "p1", originalQty: 10, unit: "pcs", unitPrice: 2, expectedDeliveryDate: "2026-07-25", deliveryTimeSlot: "Morning" }] };

describe("purchase order revision diff", () => {
  it("returns no changes for an identical document", () => expect(diffPurchaseOrder(base, structuredClone(base))).toEqual([]));
  it("reports header and line changes", () => {
    const changed = structuredClone(base); changed.notes = "urgent"; changed.items[0].originalQty = 12;
    expect(diffPurchaseOrder(base, changed).map((item) => item.path)).toEqual(["notes", "items.p1:pcs"]);
  });
  it("reports added and removed lines", () => {
    const changed: RevisionSnapshot = { ...base, items: [{ ...base.items[0], productId: "p2" }] };
    expect(diffPurchaseOrder(base, changed).map((item) => item.kind)).toEqual(["Removed", "Added"]);
  });
});
