export type AllocationCandidate = {
  poItemId: string;
  poId: string;
  poDate: Date | null;
  expectedDeliveryDate: Date | null;
  createdAt: Date;
  originalQty: number;
  activeAllocatedQty: number;
};

export type AllocationPlanLine = { poItemId: string; poId: string; allocatedQty: number };

export function buildFifoAllocationPlan(requiredQty: number, candidates: AllocationCandidate[]) {
  const sorted = [...candidates].sort((a, b) => {
    const poDate = (a.poDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.poDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
    if (poDate !== 0) return poDate;
    const deliveryDate = (a.expectedDeliveryDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.expectedDeliveryDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
    if (deliveryDate !== 0) return deliveryDate;
    const created = a.createdAt.getTime() - b.createdAt.getTime();
    return created !== 0 ? created : a.poItemId.localeCompare(b.poItemId);
  });
  let remaining = requiredQty;
  const lines: AllocationPlanLine[] = [];
  for (const candidate of sorted) {
    const available = Math.max(0, candidate.originalQty - candidate.activeAllocatedQty);
    const allocatedQty = Math.min(available, remaining);
    if (allocatedQty > 0) lines.push({ poItemId: candidate.poItemId, poId: candidate.poId, allocatedQty });
    remaining -= allocatedQty;
    if (remaining <= 0) break;
  }
  return { complete: requiredQty > 0 && remaining <= 0, shortageQty: Math.max(0, remaining), lines };
}

export function canonicalPoStatus(originalQty: number, allocatedQty: number, deliveredQty: number, manuallyClosed = false) {
  if (manuallyClosed) return "Closed";
  if (originalQty > 0 && deliveredQty >= originalQty) return "Fulfilled";
  if (allocatedQty > 0 || deliveredQty > 0) return "Partially Fulfilled";
  return "Open";
}

export function inventoryAvailability(onHand: number, reserved: number) {
  return { onHand, reserved, available: Math.max(0, onHand - reserved), shortage: Math.max(0, reserved - onHand) };
}

export type FreshnessState = "Fresh" | "Delayed" | "Stale" | "Never synced";
export function wmsFreshness(lastSuccess: Date | null, now: Date, freshMinutes = 15, staleMinutes = 60): FreshnessState {
  if (!lastSuccess) return "Never synced";
  const ageMinutes = (now.getTime() - lastSuccess.getTime()) / 60_000;
  if (ageMinutes <= freshMinutes) return "Fresh";
  if (ageMinutes <= staleMinutes) return "Delayed";
  return "Stale";
}
