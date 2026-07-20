import { requireAuthContext } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/auth/roles";
import { availablePoBalance } from "@/lib/domain/workflow";
import { prisma } from "@/lib/prisma";
import { PoForm } from "./po-form";
import { PoItemForm } from "./po-item-form";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const context = await requireAuthContext();
  const branchWhere = context.activeBranchId ? { branchId: context.activeBranchId } : undefined;
  const canEdit = hasAnyRole(context.roles, ["CS", "PURCHASING", "BRANCH_ADMIN"]);
  const [purchaseOrders, customers, products] = await Promise.all([
    prisma.purchaseOrder.findMany({ where: branchWhere, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.customer.findMany({ where: branchWhere, orderBy: { companyName: "asc" } }),
    prisma.product.findMany({ where: { ...branchWhere, active: true }, orderBy: { erpCode: "asc" } }),
  ]);
  const poIds = purchaseOrders.map((po) => po.id);
  const [items, releasedOrders] = await Promise.all([
    prisma.purchaseOrderItem.findMany({ where: { poId: { in: poIds } } }),
    prisma.order.findMany({ where: { poId: { in: poIds }, status: { notIn: ["Draft", "Cancelled", "Split-shipping", "Delivery Failed"] } } }),
  ]);
  const productOptions = products.map((product) => ({ id: product.id, label: `${product.erpCode} — ${product.partName}` }));

  return <main className="content-page"><header><p className="home-eyebrow">PURCHASING</p><h1>Purchase Orders</h1></header>
    <div className="customer-layout"><section><h2>รายการ ({purchaseOrders.length})</h2><div className="table-scroll"><table>
      <thead><tr><th>PO</th><th>วันที่</th><th>สถานะ</th><th>Contracted</th><th>Released</th><th>Balance</th><th>Action</th></tr></thead>
      <tbody>{purchaseOrders.map((po) => {
        const contracted = items.filter((item) => item.poId === po.id).reduce((sum, item) => sum + Number(item.originalQty), 0);
        const released = releasedOrders.filter((order) => order.poId === po.id).reduce((sum, order) => sum + Number(order.qty), 0);
        const canAddItem = canEdit && ["Open", "Partially Fulfilled"].includes(po.status);
        return <tr key={po.id}><td>{po.poNumber}</td><td>{po.poDate?.toISOString().slice(0, 10) || "—"}</td><td>{po.status}</td><td>{contracted}</td><td>{released}</td><td>{availablePoBalance(contracted, released)}</td><td>{canAddItem ? <PoItemForm poId={po.id} products={productOptions} /> : "—"}</td></tr>;
      })}</tbody></table></div></section>
      {canEdit ? <PoForm customers={customers.map((customer) => ({ id: customer.id, label: `${customer.customerCode} — ${customer.companyName}` }))} products={productOptions} /> : <aside className="permission-note">ไม่มีสิทธิ์สร้าง PO</aside>}
    </div>
  </main>;
}
