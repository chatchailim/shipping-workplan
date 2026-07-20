export const ORDER_TRANSITIONS: Record<string, readonly string[]> = {
  Draft: ["Confirmed", "Cancelled", "Split-shipping"],
  Confirmed: ["Ready to Ship", "Cancelled", "Wait-PO"],
  "Ready to Ship": ["Cancelled"],
  "Wait-PO": ["Confirmed", "Cancelled"],
  "In Transit": ["Delivery Failed"],
};

export const RUN_TRANSITIONS: Record<string, string> = {
  Planned: "Loading",
  Loading: "Dispatched",
  Dispatched: "Completed",
};

export function canTransitionOrder(from: string, to: string): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextRunStatus(current: string): string | null {
  return RUN_TRANSITIONS[current] ?? null;
}

export function availablePoBalance(originalQty: number, releasedQty: number): number {
  return Math.max(0, originalQty - releasedQty);
}
