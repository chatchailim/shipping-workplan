export type RevisionLine = {
  productId: string;
  originalQty: number;
  unit: string;
  unitPrice: number | null;
  expectedDeliveryDate: string | null;
  deliveryTimeSlot: string | null;
};

export type RevisionSnapshot = {
  poDate: string | null;
  notes: string | null;
  items: RevisionLine[];
};

export type RevisionChange = {
  path: string;
  kind: "Added" | "Removed" | "Changed";
  before: unknown;
  after: unknown;
};

export function diffPurchaseOrder(before: RevisionSnapshot, after: RevisionSnapshot): RevisionChange[] {
  const changes: RevisionChange[] = [];
  for (const field of ["poDate", "notes"] as const) {
    if (before[field] !== after[field]) changes.push({ path: field, kind: "Changed", before: before[field], after: after[field] });
  }
  const key = (line: RevisionLine) => `${line.productId}:${line.unit}`;
  const previous = new Map(before.items.map((line) => [key(line), line]));
  const proposed = new Map(after.items.map((line) => [key(line), line]));
  for (const [lineKey, line] of previous) {
    const next = proposed.get(lineKey);
    if (!next) changes.push({ path: `items.${lineKey}`, kind: "Removed", before: line, after: null });
    else if (JSON.stringify(line) !== JSON.stringify(next)) changes.push({ path: `items.${lineKey}`, kind: "Changed", before: line, after: next });
  }
  for (const [lineKey, line] of proposed) {
    if (!previous.has(lineKey)) changes.push({ path: `items.${lineKey}`, kind: "Added", before: null, after: line });
  }
  return changes;
}
