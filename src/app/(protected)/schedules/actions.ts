"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth/context";
import { requireAnyRole } from "@/lib/auth/roles";
import { issueDailyNumber } from "@/lib/domain/numbering";
import { isAssignmentActiveOn, runSlots } from "@/lib/domain/schedule";
import { prisma } from "@/lib/prisma";

export type ScheduleState = { ok?: boolean; error?: string; message?: string };

const scheduleSchema = z.object({
  vehicleId: z.string().min(1), primaryDriverId: z.string().min(1),
  scheduleType: z.enum(["Daily", "Rotation", "Custom"]),
  rotationOnDays: z.union([z.coerce.number().int().positive(), z.literal("")]).optional(),
  rotationOffDays: z.union([z.coerce.number().int().positive(), z.literal("")]).optional(),
  rotationStartDate: z.union([z.coerce.date(), z.literal("")]).optional(),
  customWorkingDays: z.string().optional(), runsPerDay: z.coerce.number().int().min(1).max(3),
  run1TimeSlot: z.string().regex(/^\d{2}:\d{2}$/), run2TimeSlot: z.string().optional(), run3TimeSlot: z.string().optional(),
  effectiveFrom: z.coerce.date(), effectiveTo: z.union([z.coerce.date(), z.literal("")]).optional(),
});

export async function createScheduleAction(_state: ScheduleState, formData: FormData): Promise<ScheduleState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["LOGISTICS", "BRANCH_ADMIN"]);
  if (!context.activeBranchId) return { error: "Please select a branch" };
  const parsed = scheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;
  if (data.scheduleType === "Rotation" && (!data.rotationOnDays || !data.rotationOffDays || !data.rotationStartDate)) return { error: "Rotation requires on days, off days and a start date" };
  if (data.scheduleType === "Custom" && !data.customWorkingDays) return { error: "Custom schedule requires weekday codes" };
  if (data.effectiveTo && data.effectiveTo < data.effectiveFrom) return { error: "Effective-to date cannot precede effective-from" };

  const [vehicle, driver] = await Promise.all([
    prisma.vehicle.findFirst({ where: { id: data.vehicleId, branchId: context.activeBranchId, active: true } }),
    prisma.driver.findFirst({ where: { id: data.primaryDriverId, branchId: context.activeBranchId, active: true } }),
  ]);
  if (!vehicle || !driver) return { error: "Vehicle or driver is not active in this branch" };
  if (driver.licenseExpiry < data.effectiveFrom) return { error: "Driver license expires before the schedule begins" };
  if (vehicle.vehicleClassId && !await prisma.driverVehicleClass.findFirst({ where: { driverId: driver.id, vehicleClassId: vehicle.vehicleClassId } })) return { error: "Driver is not licensed for this vehicle class" };

  const assignment = await prisma.driverVehicleAssignment.create({ data: {
    branchId: context.activeBranchId, vehicleId: vehicle.id, primaryDriverId: driver.id,
    scheduleType: data.scheduleType, rotationOnDays: data.rotationOnDays || null, rotationOffDays: data.rotationOffDays || null,
    rotationStartDate: data.rotationStartDate || null, customWorkingDays: data.customWorkingDays?.toUpperCase() || null,
    runsPerDay: data.runsPerDay, run1TimeSlot: data.run1TimeSlot, run2TimeSlot: data.run2TimeSlot || null,
    run3TimeSlot: data.run3TimeSlot || null, effectiveFrom: data.effectiveFrom, effectiveTo: data.effectiveTo || null,
  } });
  await prisma.auditLog.create({ data: { entityType: "DriverVehicleAssignment", entityId: assignment.id, action: "CREATE", userId: context.userId, branchId: context.activeBranchId } });
  revalidatePath("/schedules");
  return { ok: true, message: "Schedule created" };
}

const overrideSchema = z.object({
  assignmentId: z.string().min(1), date: z.coerce.date(), overrideType: z.enum(["Off", "Substitute"]), substituteDriverId: z.string().optional(), reason: z.string().trim().min(2),
});

export async function createOverrideAction(_state: ScheduleState, formData: FormData): Promise<ScheduleState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["LOGISTICS", "BRANCH_ADMIN"]);
  const parsed = overrideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const assignment = await prisma.driverVehicleAssignment.findFirst({ where: { id: parsed.data.assignmentId, branchId: context.activeBranchId ?? undefined, active: true } });
  if (!assignment) return { error: "Active assignment not found" };
  if (parsed.data.overrideType === "Substitute" && !parsed.data.substituteDriverId) return { error: "Select a substitute driver" };
  if (parsed.data.substituteDriverId && !await prisma.driver.findFirst({ where: { id: parsed.data.substituteDriverId, branchId: assignment.branchId, active: true } })) return { error: "Substitute driver is unavailable" };
  await prisma.driverScheduleOverride.upsert({
    where: { assignmentId_date: { assignmentId: assignment.id, date: parsed.data.date } },
    create: { assignmentId: assignment.id, date: parsed.data.date, overrideType: parsed.data.overrideType, substituteDriverId: parsed.data.substituteDriverId || null, reason: parsed.data.reason },
    update: { overrideType: parsed.data.overrideType, substituteDriverId: parsed.data.substituteDriverId || null, reason: parsed.data.reason, active: true },
  });
  revalidatePath("/schedules");
  return { ok: true, message: "Override saved" };
}

const generateSchema = z.object({ date: z.coerce.date() });

export async function generateRunsAction(_state: ScheduleState, formData: FormData): Promise<ScheduleState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["LOGISTICS", "BRANCH_ADMIN"]);
  if (!context.activeBranchId) return { error: "Please select a branch" };
  const parsed = generateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const assignments = await prisma.driverVehicleAssignment.findMany({ where: { branchId: context.activeBranchId, active: true } });
  let created = 0;
  let skipped = 0;

  for (const assignment of assignments) {
    if (!isAssignmentActiveOn(assignment, parsed.data.date)) continue;
    const override = await prisma.driverScheduleOverride.findUnique({ where: { assignmentId_date: { assignmentId: assignment.id, date: parsed.data.date } } });
    if (override?.active && override.overrideType === "Off") { skipped += assignment.runsPerDay; continue; }
    const driverId = override?.active && override.overrideType === "Substitute" && override.substituteDriverId ? override.substituteDriverId : assignment.primaryDriverId;
    for (const departureTime of runSlots(assignment.runsPerDay, [assignment.run1TimeSlot, assignment.run2TimeSlot, assignment.run3TimeSlot])) {
      const result = await prisma.$transaction(async (tx) => {
        const exists = await tx.shippingRun.findFirst({ where: { branchId: assignment.branchId, vehicleId: assignment.vehicleId, plannedDate: parsed.data.date, departureTime } });
        if (exists) return false;
        const runNumber = await issueDailyNumber(tx, "DP", parsed.data.date);
        const run = await tx.shippingRun.create({ data: { runNumber, branchId: assignment.branchId, vehicleId: assignment.vehicleId, plannedDate: parsed.data.date, departureTime, runType: "Scheduled" } });
        await tx.shippingRunDriver.create({ data: { runId: run.id, driverId, isPrimary: true } });
        await tx.auditLog.create({ data: { entityType: "ShippingRun", entityId: run.id, action: "GENERATE_FROM_SCHEDULE", userId: context.userId, branchId: assignment.branchId, after: JSON.stringify({ assignmentId: assignment.id }) } });
        return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (result) created += 1; else skipped += 1;
    }
  }
  revalidatePath("/schedules"); revalidatePath("/delivery");
  return { ok: true, message: `Created ${created}; skipped ${skipped}` };
}
