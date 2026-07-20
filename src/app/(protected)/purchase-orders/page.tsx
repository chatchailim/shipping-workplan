import { requireAuthContext } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/auth/roles";
import { availablePoBalance } from "@/lib/domain/workflow";
import { canonicalPoStatus } from "@/lib/domain/canonical";
import { FIFO_FEATURE } from "@/lib/domain/allocation-service";
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
  const [items, releasedOrders, feature] = await Promise.all([
    prisma.purchaseOrderItem.findMany({ where: { poId: { in: poIds } } }),
    prisma.order.findMany({ where: { poId: { in: poIds }, status: { notIn: ["Draft", "Cancelled", "Split-shipping", "Delivery Failed"] } } }),
    context.activeBranchId ? prisma.branchFeatureFlag.findUnique({ where: { branchId_key: { branchId: context.activeBranchId, key: FIFO_FEATURE } } }) : null,
  ]);
  const allocations = feature?.enabled ? await prisma.orderAllocation.findMany({
    where: { poItemId: { in: items.map((item) => item.id) }, status: "Active" },
    select: { poItemId: true, allocatedQty: true, orderId: true },
  }) : [];
  const allocatedOrders = feature?.enabled ? await prisma.order.findMany({ where: { id: { in: allocations.map((row) => row.orderId) } }, select: { id: true, status: true } }) : [];
  const allocatedOrderStatus = new Map(allocatedOrders.map((order) => [order.id, order.status]));
  const productOptions = products.map((product) => ({ id: product.id, label: `${product.erpCode} — ${product.partName}` }));

  return <main className="content-page"><header><p className="home-eyebrow">PURCHASING</p><h1>Purchase Orders</h1><p>Allocation mode: <strong>{feature?.enabled ? "Canonical FIFO (BB pilot)" : "Legacy PO reference"}</strong></p></header>
    <div className="customer-layout"><section><h2>รายการ ({purchaseOrders.length})</h2><div className="table-scroll"><table>
      <thead><tr><th>PO</th><th>วันที่</th><th>สถานะ</th><th>Contracted</th><th>Released</th><th>Balance</th><th>Action</th></tr></thead>
      <tbody>{purchaseOrders.map((po) => {
        const contracted = items.filter((item) => item.poId === po.id).reduce((sum, item) => sum + Number(item.originalQty), 0);
        const poItemIds = new Set(items.filter((item) => item.poId === po.id).map((item) => item.id));
        const poAllocations = allocations.filter((row) => poItemIds.has(row.poItemId));
        const released = feature?.enabled ? poAllocations.reduce((sum, row) => sum + Number(row.allocatedQty), 0) : releasedOrders.filter((order) => order.poId === po.id).reduce((sum, order) => sum + Number(order.qty), 0);
        const delivered = poAllocations.filter((row) => allocatedOrderStatus.get(row.orderId) === "Delivered").reduce((sum, row) => sum + Number(row.allocatedQty), 0);
        const displayStatus = feature?.enabled ? canonicalPoStatus(contracted, released, delivered, po.status === "Closed") : po.status;
        const canAddItem = canEdit && ["Open", "Partially Fulfilled"].includes(po.status);
        return <tr key={po.id}><td>{po.poNumber}</td><td>{po.poDate?.toISOString().slice(0, 10) || "—"}</td><td>{displayStatus}</td><td>{contracted}</td><td>{released}</td><td>{availablePoBalance(contracted, released)}</td><td>{canAddItem ? <PoItemForm poId={po.id} products={productOptions} /> : "—"}</td></tr>;
      })}</tbody></table></div></section>
      {canEdit ? <PoForm customers={customers.map((customer) => ({ id: customer.id, label: `${customer.customerCode} — ${customer.companyName}` }))} products={productOptions} /> : <aside className="permission-note">ไม่มีสิทธิ์สร้าง PO</aside>}
    </div>
  </main>;
}
