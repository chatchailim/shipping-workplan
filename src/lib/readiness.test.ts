import { describe, expect, it } from "vitest";
import { DASHBOARD_READINESS_ITEMS } from "./readiness";

describe("dashboard readiness copy", () => {
  it("reflects the implemented UAT vertical slices", () => {
    const copy = DASHBOARD_READINESS_ITEMS.join(" ");
    expect(copy).toContain("PO");
    expect(copy).toContain("Order");
    expect(copy).toContain("Delivery");
    expect(copy).toContain("production gates");
    expect(copy).not.toContain("ลำดับพัฒนาถัดไป");
  });
});
