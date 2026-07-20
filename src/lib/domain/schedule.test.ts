import { describe, expect, it } from "vitest";
import { isAssignmentActiveOn, runSlots } from "./schedule";

const base = { effectiveFrom: new Date("2026-07-01T00:00:00Z"), effectiveTo: null, rotationOnDays: null, rotationOffDays: null, rotationStartDate: null, customWorkingDays: null };

describe("fleet schedules", () => {
  it("applies daily rules inside their effective period", () => {
    expect(isAssignmentActiveOn({ ...base, scheduleType: "Daily" }, new Date("2026-07-20T00:00:00Z"))).toBe(true);
    expect(isAssignmentActiveOn({ ...base, scheduleType: "Daily" }, new Date("2026-06-30T00:00:00Z"))).toBe(false);
  });
  it("supports custom weekdays", () => {
    const rule = { ...base, scheduleType: "Custom", customWorkingDays: "MON,WED,FRI" };
    expect(isAssignmentActiveOn(rule, new Date("2026-07-20T00:00:00Z"))).toBe(true);
    expect(isAssignmentActiveOn(rule, new Date("2026-07-21T00:00:00Z"))).toBe(false);
  });
  it("supports on/off rotation cycles", () => {
    const rule = { ...base, scheduleType: "Rotation", rotationStartDate: new Date("2026-07-20T00:00:00Z"), rotationOnDays: 2, rotationOffDays: 1 };
    expect(isAssignmentActiveOn(rule, new Date("2026-07-21T00:00:00Z"))).toBe(true);
    expect(isAssignmentActiveOn(rule, new Date("2026-07-22T00:00:00Z"))).toBe(false);
  });
  it("limits run slots to three configured values", () => expect(runSlots(2, ["08:00", "14:00", "18:00"])).toEqual(["08:00", "14:00"]));
});
