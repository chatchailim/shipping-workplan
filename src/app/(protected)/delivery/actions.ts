"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth/context";
import { requireAnyRole } from "@/lib/auth/roles";
import { issueDailyNumber } from "@/lib/domain/numbering";
import { nextRunStatus } from "@/lib/domain/workflow";
import { prisma } from "@/lib/prisma";

export type DeliveryState = { ok?: boolean; error?: string };

const runSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  plannedDate: z.coerce.date(),
  departureTime: z.string().optional(),
});

export async function createRunAction(
  _state: DeliveryState,
  formData: FormData,
): Promise<DeliveryState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["LOGISTICS", "BRANCH_ADMIN"]);
  if (!context.activeBranchId) return { error: "Please select a branch" };

  const parsed = runSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: parsed.data.vehicleId,
      branchId: context.activeBranchId,
      active: true,
    },
  });
  if (!vehicle) return { error: "Vehicle is not active in the selected branch" };

  const [driver, licensed] = await Promise.all([
    prisma.driver.findFirst({
      where: {
        id: parsed.data.driverId,
        branchId: context.activeBranchId,
        active: true,
      },
    }),
    vehicle.vehicleClassId
      ? prisma.driverVehicleClass.findFirst({
          where: {
            driverId: parsed.data.driverId,
            vehicleClassId: vehicle.vehicleClassId,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!driver) return { error: "Driver is not active in the selected branch" };
  if (driver.licenseExpiry < new Date()) return { error: "Driver license has expired" };
  if (vehicle.vehicleClassId && !licensed) {
    return { error: "Driver is not licensed for this vehicle class" };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const runNumber = await issueDailyNumber(tx, "DP", parsed.data.plannedDate);
        const run = await tx.shippingRun.create({
          data: {
            runNumber,
            branchId: context.activeBranchId!,
            vehicleId: vehicle.id,
            plannedDate: parsed.data.plannedDate,
            departureTime: parsed.data.departureTime || null,
          },
        });
        await tx.shippingRunDriver.create({
          data: { runId: run.id, driverId: driver.id, isPrimary: true },
        });
        await tx.auditLog.create({
          data: {
            entityType: "ShippingRun",
            entityId: run.id,
            action: "CREATE",
            userId: context.userId,
            branchId: context.activeBranchId!,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch {
    return { error: "Unable to issue a run number or create the delivery run" };
  }

  revalidatePath("/delivery");
  return { ok: true };
}

export async function assignStopAction(formData: FormData) {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["LOGISTICS", "BRANCH_ADMIN"]);
  const runId = String(formData.get("runId"));
  const orderId = String(formData.get("orderId"));

  const [run, order] = await Promise.all([
    prisma.shippingRun.findFirst({
      where: { id: runId, branchId: context.activeBranchId ?? undefined, status: "Planned" },
    }),
    prisma.order.findFirst({
      where: {
        id: orderId,
        branchId: context.activeBranchId ?? undefined,
        status: { in: ["Confirmed", "Ready to Ship"] },
      },
    }),
  ]);
  if (!run || !order) throw new Error("Run or order is not ready for assignment");

  const stopCount = await prisma.shippingRunOrder.count({ where: { runId } });
  await prisma.shippingRunOrder.create({
    data: { runId, orderId, stopSequence: stopCount + 1 },
  });
  revalidatePath("/delivery");
}

export async function moveStopAction(formData: FormData) {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["LOGISTICS", "BRANCH_ADMIN"]);
  const stopId = String(formData.get("stopId"));
  const direction = String(formData.get("direction"));
  if (!['up', 'down'].includes(direction)) throw new Error("Invalid stop direction");
  await prisma.$transaction(async (tx) => {
    const stop = await tx.shippingRunOrder.findUnique({ where: { id: stopId } });
    if (!stop) throw new Error("Stop not found");
    const run = await tx.shippingRun.findFirst({ where: { id: stop.runId, branchId: context.activeBranchId ?? undefined, status: "Planned" } });
    if (!run) throw new Error("Stops can only be reordered while a run is Planned");
    const adjacent = await tx.shippingRunOrder.findFirst({
      where: { runId: stop.runId, stopSequence: direction === "up" ? { lt: stop.stopSequence } : { gt: stop.stopSequence } },
      orderBy: { stopSequence: direction === "up" ? "desc" : "asc" },
    });
    if (!adjacent) return;
    await tx.shippingRunOrder.update({ where: { id: stop.id }, data: { stopSequence: adjacent.stopSequence } });
    await tx.shippingRunOrder.update({ where: { id: adjacent.id }, data: { stopSequence: stop.stopSequence } });
    await tx.auditLog.create({ data: { entityType: "ShippingRun", entityId: run.id, action: "REORDER_STOPS", userId: context.userId, branchId: run.branchId, after: JSON.stringify({ stopId, direction }) } });
  });
  revalidatePath("/delivery");
}

const podSchema = z.object({ runOrderId: z.string().min(1), recipientName: z.string().trim().min(2).max(120) });

export async function submitPodAction(_state: DeliveryState, formData: FormData): Promise<DeliveryState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["DRIVER", "LOGISTICS", "BRANCH_ADMIN"]);
  const parsed = podSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.deliveryProof.findUnique({ where: { runOrderId: parsed.data.runOrderId } });
      if (existing) return;
      const stop = await tx.shippingRunOrder.findUnique({ where: { id: parsed.data.runOrderId } });
      if (!stop) throw new Error("Delivery stop not found");
      const run = await tx.shippingRun.findFirst({ where: { id: stop.runId, branchId: context.activeBranchId ?? undefined, status: "Dispatched" } });
      const order = await tx.order.findFirst({ where: { id: stop.orderId, branchId: context.activeBranchId ?? undefined, status: "In Transit" } });
      if (!run || !order) throw new Error("Stop is not ready for POD");
      const driverOnly = context.roles.includes("DRIVER") && !context.roles.some((role) => ["LOGISTICS", "BRANCH_ADMIN", "SUPER_ADMIN"].includes(role));
      if (driverOnly && (!context.driverId || !await tx.shippingRunDriver.findFirst({ where: { runId: run.id, driverId: context.driverId } }))) throw new Error("Driver is not assigned to this run");
      await tx.deliveryProof.create({ data: { runOrderId: stop.id, recipientName: parsed.data.recipientName, capturedById: context.userId } });
      await tx.order.update({ where: { id: order.id }, data: { status: "Delivered" } });
      await tx.auditLog.create({ data: { entityType: "Order", entityId: order.id, action: "POD_SUBMITTED", userId: context.userId, branchId: order.branchId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to submit POD" };
  }
  revalidatePath("/delivery"); revalidatePath("/orders");
  return { ok: true };
}

const failureSchema = z.object({ runOrderId: z.string().min(1), reason: z.string().trim().min(3).max(300) });

export async function deliveryFailedAction(_state: DeliveryState, formData: FormData): Promise<DeliveryState> {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["DRIVER", "LOGISTICS", "BRANCH_ADMIN"]);
  const parsed = failureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await prisma.$transaction(async (tx) => {
      const stop = await tx.shippingRunOrder.findUnique({ where: { id: parsed.data.runOrderId } });
      if (!stop) throw new Error("Delivery stop not found");
      const run = await tx.shippingRun.findFirst({ where: { id: stop.runId, branchId: context.activeBranchId ?? undefined, status: "Dispatched" } });
      const order = await tx.order.findFirst({ where: { id: stop.orderId, branchId: context.activeBranchId ?? undefined } });
      if (!run || !order) throw new Error("Stop is unavailable");
      const driverOnly = context.roles.includes("DRIVER") && !context.roles.some((role) => ["LOGISTICS", "BRANCH_ADMIN", "SUPER_ADMIN"].includes(role));
      if (driverOnly && (!context.driverId || !await tx.shippingRunDriver.findFirst({ where: { runId: run.id, driverId: context.driverId } }))) throw new Error("Driver is not assigned to this run");
      const existingReturn = await tx.return.findFirst({ where: { orderId: order.id } });
      if (order.status === "Delivery Failed" && existingReturn) return;
      if (order.status !== "In Transit") throw new Error("Only an In Transit order can fail delivery");
      await tx.order.update({ where: { id: order.id }, data: { status: "Delivery Failed" } });
      if (!existingReturn) await tx.return.create({ data: { orderId: order.id, customerId: order.customerId, productId: order.productId, branchId: order.branchId, qty: order.qty, status: "Pending", notes: parsed.data.reason } });
      await tx.auditLog.create({ data: { entityType: "Order", entityId: order.id, action: "DELIVERY_FAILED", userId: context.userId, branchId: order.branchId, after: JSON.stringify({ reason: parsed.data.reason }) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to record delivery failure" };
  }
  revalidatePath("/delivery"); revalidatePath("/orders"); revalidatePath("/purchase-orders");
  return { ok: true };
}

export async function advanceRunAction(formData: FormData) {
  const context = await requireAuthContext();
  requireAnyRole(context.roles, ["LOGISTICS", "WAREHOUSE", "BRANCH_ADMIN"]);
  const id = String(formData.get("id"));

  await prisma.$transaction(
    async (tx) => {
      const run = await tx.shippingRun.findFirst({
        where: { id, branchId: context.activeBranchId ?? undefined },
      });
      if (!run) throw new Error("Delivery run not found");

      const nextStatus = nextRunStatus(run.status);
      if (!nextStatus) throw new Error("Delivery run is already complete");
      if (
        run.status === "Planned" &&
        !context.roles.some((role) =>
          ["WAREHOUSE", "BRANCH_ADMIN", "SUPER_ADMIN"].includes(role),
        )
      ) {
        throw new Error("Warehouse role is required to begin loading");
      }

      const stops = await tx.shippingRunOrder.findMany({
        where: { runId: id },
        select: { orderId: true },
      });
      if (nextStatus === "Dispatched" && stops.length === 0) {
        throw new Error("At least one stop is required before dispatch");
      }

      const orderIds = stops.map((stop) => stop.orderId);
      if (nextStatus === "Dispatched") {
        await tx.order.updateMany({
          where: {
            id: { in: orderIds },
            status: { in: ["Confirmed", "Ready to Ship"] },
          },
          data: { status: "In Transit" },
        });
      }

      if (nextStatus === "Completed") {
        const unresolved = await tx.order.count({ where: { id: { in: orderIds }, status: { notIn: ["Delivered", "Delivery Failed"] } } });
        if (unresolved > 0) throw new Error("Every stop requires POD or Delivery Failed before completion");

        const linkedOrders = await tx.order.findMany({
          where: { id: { in: orderIds }, poId: { not: null } },
          select: { poId: true },
        });
        const poIds = [
          ...new Set(
            linkedOrders.map((order) => order.poId).filter((poId): poId is string => Boolean(poId)),
          ),
        ];

        for (const poId of poIds) {
          const [items, released, delivered] = await Promise.all([
            tx.purchaseOrderItem.aggregate({
              _sum: { originalQty: true },
              where: { poId },
            }),
            tx.order.aggregate({
              _sum: { qty: true },
              where: { poId, status: { notIn: ["Draft", "Cancelled", "Split-shipping", "Delivery Failed"] } },
            }),
            tx.order.aggregate({
              _sum: { qty: true },
              where: { poId, status: "Delivered" },
            }),
          ]);
          const originalQuantity = Number(items._sum.originalQty ?? 0);
          const releasedQuantity = Number(released._sum.qty ?? 0);
          const deliveredQuantity = Number(delivered._sum.qty ?? 0);
          await tx.purchaseOrder.update({
            where: { id: poId },
            data: {
              status:
                originalQuantity > 0 && deliveredQuantity >= originalQuantity
                  ? "Fulfilled"
                  : releasedQuantity > 0
                    ? "Partially Fulfilled"
                    : "Open",
            },
          });
        }
      }

      await tx.shippingRun.update({ where: { id }, data: { status: nextStatus } });
      await tx.auditLog.create({
        data: {
          entityType: "ShippingRun",
          entityId: id,
          action: `STATUS_${nextStatus}`,
          userId: context.userId,
          branchId: run.branchId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  revalidatePath("/delivery");
  revalidatePath("/orders");
  revalidatePath("/dashboard");
}
