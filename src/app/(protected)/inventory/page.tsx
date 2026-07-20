import { requireAuthContext } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { MovementForm } from "./movement-form";

export const dynamic = "force-dynamic";
export default async function InventoryPage() {
  const context = await requireAuthContext();
  const where = context.activeBranchId ? { branchId: context.activeBranchId } : undefined;
  const [inventory, products] = await Promise.all([prisma.inventory.findMany({ where, orderBy: { updatedAt: "desc" } }), prisma.product.findMany({ where: { ...where, active: true }, orderBy: { erpCode: "asc" } })]);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const movements = await prisma.stockMovement.findMany({ where: { inventoryId: { in: inventory.map((item) => item.id) } }, orderBy: { createdAt: "desc" }, take: 50 });
  const inventoryMap = new Map(inventory.map((item) => [item.id, item]));
  return <main className="content-page"><header><p className="home-eyebrow">WAREHOUSE</p><h1>Inventory</h1><p>ยอดคงเหลือและ immutable stock ledger แยกตามสาขา</p></header><div className="customer-layout"><section>
    <h2>On Hand</h2><div className="table-scroll"><table><thead><tr><th>Product</th><th>Zone</th><th>On Hand</th></tr></thead><tbody>{inventory.map((item) => <tr key={item.id}><td>{productMap.get(item.productId)?.erpCode ?? item.productId}</td><td>{item.zone}</td><td>{item.onHand.toString()}</td></tr>)}</tbody></table></div>
    <h2>Movements</h2><div className="table-scroll"><table><thead><tr><th>เวลา</th><th>Product</th><th>Type</th><th>Qty</th><th>Reference</th><th>Note</th></tr></thead><tbody>{movements.map((movement) => { const item = inventoryMap.get(movement.inventoryId); return <tr key={movement.id}><td>{movement.createdAt.toLocaleString("th-TH")}</td><td>{item ? productMap.get(item.productId)?.erpCode : "—"}</td><td>{movement.type}</td><td>{movement.qty.toString()}</td><td>{movement.referenceId ?? "—"}</td><td>{movement.note ?? "—"}</td></tr>; })}</tbody></table></div>
  </section>{hasAnyRole(context.roles, ["WAREHOUSE", "BRANCH_ADMIN"]) ? <MovementForm products={products.map((item) => ({ id: item.id, label: `${item.erpCode} — ${item.partName}` }))} /> : <aside className="permission-note">ไม่มีสิทธิ์บันทึก Stock Movement</aside>}</div></main>;
}
