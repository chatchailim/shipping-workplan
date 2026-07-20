export type ScheduleRule = {
  scheduleType: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  rotationOnDays: number | null;
  rotationOffDays: number | null;
  rotationStartDate: Date | null;
  customWorkingDays: string | null;
};

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isAssignmentActiveOn(rule: ScheduleRule, date: Date): boolean {
  const target = utcDay(date);
  if (target < utcDay(rule.effectiveFrom)) return false;
  if (rule.effectiveTo && target > utcDay(rule.effectiveTo)) return false;

  if (rule.scheduleType === "Daily") return true;
  if (rule.scheduleType === "Custom") {
    const allowed = new Set((rule.customWorkingDays ?? "").split(",").map((day) => day.trim().toUpperCase()).filter(Boolean));
    return allowed.has(DAY_CODES[date.getUTCDay()]);
  }
  if (rule.scheduleType === "Rotation") {
    if (!rule.rotationStartDate || !rule.rotationOnDays || !rule.rotationOffDays) return false;
    const elapsed = Math.floor((target - utcDay(rule.rotationStartDate)) / 86_400_000);
    if (elapsed < 0) return false;
    const cycle = rule.rotationOnDays + rule.rotationOffDays;
    return elapsed % cycle < rule.rotationOnDays;
  }
  return false;
}

export function runSlots(runsPerDay: number, slots: Array<string | null>): string[] {
  return slots.slice(0, Math.max(1, Math.min(3, runsPerDay))).filter((slot): slot is string => Boolean(slot));
}
