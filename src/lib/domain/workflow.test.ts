import { describe, expect, it } from "vitest";
import { availablePoBalance, canTransitionOrder, fitsSplitSource, isValidSplitQuantity, nextRunStatus } from "./workflow";

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
  it("requires two positive quantities when splitting", () => {
    expect(isValidSplitQuantity(3, 1)).toBe(true);
    expect(isValidSplitQuantity(3, 3)).toBe(false);
  });
  it("prevents child amendments from exceeding the split source", () => {
    expect(fitsSplitSource(3, 1, 2)).toBe(true);
    expect(fitsSplitSource(3, 2, 2)).toBe(false);
  });
});
