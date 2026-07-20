import { requireAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const context = await requireAuthContext();
  const returns = await prisma.return.findMany({ where: context.activeBranchId ? { branchId: context.activeBranchId } : undefined, orderBy: { createdAt: "desc" }, take: 100 });
  const orders = await prisma.order.findMany({ where: { id: { in: returns.map((item) => item.orderId).filter((id): id is string => Boolean(id)) } } });
  const orderMap = new Map(orders.map((order) => [order.id, order]));
  return <main className="content-page"><header><p className="home-eyebrow">OPERATIONS</p><h1>Returns</h1><p>รายการที่สร้างจาก Delivery Failed และรอการตรวจรับ/แก้ไข</p></header>
    <section className="readiness-panel"><h2>รายการ ({returns.length})</h2><div className="table-scroll"><table><thead><tr><th>Order</th><th>PO Ref</th><th>Qty</th><th>สถานะ</th><th>เหตุผล</th><th>สร้างเมื่อ</th></tr></thead>
      <tbody>{returns.map((item) => { const order = item.orderId ? orderMap.get(item.orderId) : undefined; return <tr key={item.id}><td>{order?.runNumber ?? "—"}</td><td>{order?.customerPORef ?? "—"}</td><td>{item.qty.toString()}</td><td>{item.status}</td><td>{item.notes ?? "—"}</td><td>{item.createdAt.toLocaleString("th-TH")}</td></tr>; })}</tbody></table></div></section>
  </main>;
}
