import { requireAuthContext } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { receiveReturnAction } from "./actions";
import { ResolutionForm } from "./resolution-form";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const context = await requireAuthContext();
  const canResolve = hasAnyRole(context.roles, ["WAREHOUSE", "BRANCH_ADMIN"]);
  const returns = await prisma.return.findMany({ where: context.activeBranchId ? { branchId: context.activeBranchId } : undefined, orderBy: { createdAt: "desc" }, take: 100 });
  const orders = await prisma.order.findMany({ where: { id: { in: returns.map((item) => item.orderId).filter((id): id is string => Boolean(id)) } } });
  const orderMap = new Map(orders.map((order) => [order.id, order]));
  return <main className="content-page"><header><p className="home-eyebrow">OPERATIONS</p><h1>Returns</h1><p>รับคืน ตรวจสภาพ และปิดผลโดยเก็บ stock movement เมื่อ Restock</p></header>
    <section className="readiness-panel"><h2>รายการ ({returns.length})</h2><div className="table-scroll"><table><thead><tr><th>Order</th><th>PO Ref</th><th>Qty</th><th>สถานะ</th><th>ผล</th><th>เหตุผล/หมายเหตุ</th><th>Action</th></tr></thead>
      <tbody>{returns.map((item) => { const order = item.orderId ? orderMap.get(item.orderId) : undefined; return <tr key={item.id}><td>{order?.runNumber ?? "—"}</td><td>{order?.customerPORef ?? "—"}</td><td>{item.qty.toString()}</td><td>{item.status}</td><td>{item.resolution ?? "—"}</td><td>{item.notes ?? "—"}</td><td>
        {canResolve && item.status === "Pending" && <form action={receiveReturnAction}><input name="id" type="hidden" value={item.id} /><button>รับคืน</button></form>}
        {canResolve && item.status === "Received" && <ResolutionForm id={item.id} />}
      </td></tr>; })}</tbody></table></div></section>
  </main>;
}
