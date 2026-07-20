import { describe, expect, it } from "vitest";
import { availablePoBalance, canTransitionOrder, nextRunStatus } from "./workflow";

describe("business workflow", () => {
  it("permits only declared order transitions", () => {
    expect(canTransitionOrder("Draft", "Confirmed")).toBe(true);
    expect(canTransitionOrder("Draft", "Delivered")).toBe(false);
  });
  it("advances runs forward only", () => {
    expect(nextRunStatus("Planned")).toBe("Loading");
    expect(nextRunStatus("Completed")).toBeNull();
  });
  it("never exposes a negative PO balance", () => expect(availablePoBalance(100, 120)).toBe(0));
});
