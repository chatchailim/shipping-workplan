import { requireAuthContext } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { inventoryAvailability, wmsFreshness } from "@/lib/domain/canonical";
import { MovementForm } from "./movement-form";

export const dynamic = "force-dynamic";
export default async function InventoryPage() {
  const context = await requireAuthContext();
  const where = context.activeBranchId ? { branchId: context.activeBranchId } : undefined;
  const [inventory, products] = await Promise.all([prisma.inventory.findMany({ where, orderBy: { updatedAt: "desc" } }), prisma.product.findMany({ where: { ...where, active: true }, orderBy: { erpCode: "asc" } })]);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const [movements, locations, lastSync, allocations] = await Promise.all([
    prisma.stockMovement.findMany({ where: { inventoryId: { in: inventory.map((item) => item.id) } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.inventoryLocationBalance.findMany({ where: { inventoryId: { in: inventory.map((item) => item.id) } }, orderBy: [{ zone: "asc" }, { bin: "asc" }] }),
    prisma.wmsSyncLog.findFirst({ where: { branchId: context.activeBranchId ?? undefined, status: "Completed" }, orderBy: { startedAt: "desc" } }),
    prisma.orderAllocation.findMany({ where: { status: "Active" }, select: { allocatedQty: true, poItemId: true, orderId: true } }),
  ]);
  const inventoryMap = new Map(inventory.map((item) => [item.id, item]));
  const reservationOrders = await prisma.order.findMany({ where: { id: { in: allocations.map((row) => row.orderId) }, branchId: context.activeBranchId ?? undefined, status: { in: ["Confirmed", "Ready to Ship", "In Transit"] } }, select: { id: true } });
  const reservingOrderIds = new Set(reservationOrders.map((order) => order.id));
  const reservationItems = await prisma.purchaseOrderItem.findMany({ where: { id: { in: allocations.map((row) => row.poItemId) } }, select: { id: true, productId: true } });
  const allocationProduct = new Map(reservationItems.map((item) => [item.id, item.productId]));
  const reservedByProduct = new Map<string, number>();
  for (const row of allocations) { const productId = allocationProduct.get(row.poItemId); if (productId && reservingOrderIds.has(row.orderId)) reservedByProduct.set(productId, (reservedByProduct.get(productId) ?? 0) + Number(row.allocatedQty)); }
  const lastSyncAt = lastSync?.completedAt ?? lastSync?.startedAt ?? null;
  const freshness = wmsFreshness(lastSyncAt, new Date());
  return <main className="content-page"><header><p className="home-eyebrow">WAREHOUSE</p><h1>Inventory</h1><p>ยอดคงเหลือและ immutable stock ledger แยกตามสาขา · WMS freshness: <strong>{freshness}</strong>{lastSyncAt ? ` · Last success: ${lastSyncAt.toLocaleString("th-TH")}` : " · ยังไม่เคย sync สำเร็จ"}</p></header><div className="customer-layout"><section>
    <h2>Availability</h2><div className="table-scroll"><table><thead><tr><th>Product</th><th>Zone</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>Shortage</th></tr></thead><tbody>{inventory.map((item) => { const availability = inventoryAvailability(Number(item.onHand), reservedByProduct.get(item.productId) ?? 0); return <tr key={item.id}><td>{productMap.get(item.productId)?.erpCode ?? item.productId}</td><td>{item.zone}</td><td>{availability.onHand}</td><td>{availability.reserved}</td><td>{availability.available}</td><td>{availability.shortage}</td></tr>; })}</tbody></table></div>
    <h2>Location balances</h2><div className="table-scroll"><table><thead><tr><th>Product</th><th>Zone</th><th>Bin</th><th>On Hand</th><th>Source</th></tr></thead><tbody>{locations.map((location) => { const item = inventoryMap.get(location.inventoryId); return <tr key={location.id}><td>{item ? productMap.get(item.productId)?.erpCode : "—"}</td><td>{location.zone}</td><td>{location.bin ?? "—"}</td><td>{location.onHand.toString()}</td><td>{location.source}</td></tr>; })}</tbody></table></div>
    <h2>Movements</h2><div className="table-scroll"><table><thead><tr><th>เวลา</th><th>Product</th><th>Type</th><th>Qty</th><th>Reference</th><th>Note</th></tr></thead><tbody>{movements.map((movement) => { const item = inventoryMap.get(movement.inventoryId); return <tr key={movement.id}><td>{movement.createdAt.toLocaleString("th-TH")}</td><td>{item ? productMap.get(item.productId)?.erpCode : "—"}</td><td>{movement.type}</td><td>{movement.qty.toString()}</td><td>{movement.referenceId ?? "—"}</td><td>{movement.note ?? "—"}</td></tr>; })}</tbody></table></div>
  </section>{hasAnyRole(context.roles, ["WAREHOUSE", "BRANCH_ADMIN"]) ? <MovementForm products={products.map((item) => ({ id: item.id, label: `${item.erpCode} — ${item.partName}` }))} /> : <aside className="permission-note">ไม่มีสิทธิ์บันทึก Stock Movement</aside>}</div></main>;
}
