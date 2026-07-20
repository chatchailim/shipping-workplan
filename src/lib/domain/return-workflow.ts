export const RETURN_TRANSITIONS: Record<string, readonly string[]> = {
  Pending: ["Received", "Cancelled"],
  Received: ["Resolved"],
};

export const RETURN_RESOLUTIONS = ["Restock", "Scrap", "Replace"] as const;

export function canTransitionReturn(from: string, to: string): boolean {
  return RETURN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function affectsOnHand(resolution: string): boolean {
  return resolution === "Restock";
}
