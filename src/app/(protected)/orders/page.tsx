import { requireAuthContext } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { cancelOrderAction, confirmOrderAction, readyOrderAction } from "./actions";
import { DraftOrderActions } from "./order-actions";
import { OrderForm } from "./order-form";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const context = await requireAuthContext();
  const branchWhere = context.activeBranchId ? { branchId: context.activeBranchId } : undefined;
  const canManage = hasAnyRole(context.roles, ["CS", "BRANCH_ADMIN"]);
  const [orders, customers, products, purchaseOrders] = await Promise.all([
    prisma.order.findMany({ where: branchWhere, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.customer.findMany({ where: branchWhere }),
    prisma.product.findMany({ where: { ...branchWhere, active: true } }),
    prisma.purchaseOrder.findMany({ where: { ...branchWhere, status: { not: "Closed" } } }),
  ]);
  const allocations = await prisma.orderAllocation.findMany({
    where: { orderId: { in: orders.map((order) => order.id) }, status: "Active" },
    select: { orderId: true, poItemId: true },
  });
  const allocatedItems = await prisma.purchaseOrderItem.findMany({ where: { id: { in: allocations.map((row) => row.poItemId) } }, select: { id: true, poId: true } });
  const allocatedPos = await prisma.purchaseOrder.findMany({ where: { id: { in: allocatedItems.map((item) => item.poId) } }, select: { id: true, poNumber: true } });
  const itemPo = new Map(allocatedItems.map((item) => [item.id, item.poId]));
  const poNumber = new Map(allocatedPos.map((po) => [po.id, po.poNumber]));
  const allocationRefs = new Map<string, string[]>();
  for (const row of allocations) { const ref = poNumber.get(itemPo.get(row.poItemId) ?? ""); if (ref) allocationRefs.set(row.orderId, [...new Set([...(allocationRefs.get(row.orderId) ?? []), ref])]); }

  return <main className="content-page"><header><p className="home-eyebrow">SHIPPING PLAN</p><h1>Orders</h1></header>
    <div className="customer-layout"><section><h2>รายการ ({orders.length})</h2><div className="table-scroll"><table>
      <thead><tr><th>SP</th><th>PO Ref</th><th>Qty</th><th>วันที่</th><th>สถานะ</th><th>ความสัมพันธ์</th><th>Action</th></tr></thead>
      <tbody>{orders.map((order) => <tr key={order.id}>
        <td>{order.runNumber || "—"}</td><td>{allocationRefs.get(order.id)?.join(" + ") || order.customerPORef}</td><td>{order.qty.toString()}</td>
        <td>{order.requiredDate.toISOString().slice(0, 10)}</td><td>{order.status}</td>
        <td>{order.parentOrderId ? "Split child" : order.status === "Split-shipping" ? "Split source" : "—"}</td>
        <td><div className="order-action-stack">
          {order.status === "Draft" && canManage && <DraftOrderActions order={{ id: order.id, qty: order.qty.toString(), requiredDate: order.requiredDate.toISOString().slice(0, 10), shippingTimeSlot: order.shippingTimeSlot, priority: order.priority }} />}
          {order.status === "Draft" && canManage && <form action={confirmOrderAction}><input type="hidden" name="id" value={order.id} /><button>Confirm</button></form>}
          {order.status === "Confirmed" && <form action={readyOrderAction}><input type="hidden" name="id" value={order.id} /><button>Ready</button></form>}
          {["Draft", "Confirmed", "Ready to Ship"].includes(order.status) && canManage && <form action={cancelOrderAction}><input type="hidden" name="id" value={order.id} /><button className="danger-button">Cancel</button></form>}
        </div></td>
      </tr>)}</tbody></table></div></section>
      {canManage ? <OrderForm customers={customers.map((customer) => ({ id: customer.id, label: customer.companyName }))} products={products.map((product) => ({ id: product.id, label: `${product.erpCode} — ${product.partName}` }))} pos={purchaseOrders.map((po) => ({ id: po.id, label: po.poNumber }))} /> : <aside className="permission-note">ไม่มีสิทธิ์สร้าง Order</aside>}
    </div>
  </main>;
}
