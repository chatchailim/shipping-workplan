import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await requireAuthContext();
  const branchId = context.activeBranchId;
  const branchWhere = branchId ? { branchId } : undefined;
  const [customers, products, orders, runs, branch] = await Promise.all([
    prisma.customer.count({ where: branchWhere }),
    prisma.product.count({ where: branchWhere }),
    prisma.order.count({ where: branchWhere }),
    prisma.shippingRun.count({ where: branchWhere }),
    branchId ? prisma.branch.findUnique({ where: { id: branchId } }) : null,
  ]);
  return (
    <main className="content-page">
      <header><p className="home-eyebrow">OPERATION OVERVIEW</p><h1>ภาพรวมระบบ</h1><p>ข้อมูลจริงจากฐานข้อมูล {branch ? `— ${branch.name}` : ""}</p></header>
      <section className="metric-grid" aria-label="ตัวชี้วัดระบบ">
        <article><span>ลูกค้า</span><strong>{customers}</strong></article>
        <article><span>สินค้า</span><strong>{products}</strong></article>
        <article><span>Order</span><strong>{orders}</strong></article>
        <article><span>เที่ยวรถ</span><strong>{runs}</strong></article>
      </section>
      <section className="readiness-panel"><h2>สถานะความพร้อม</h2><ul><li>Authentication และ branch context เปิดใช้งานแล้ว</li><li>Customer master เป็น vertical slice แรก</li><li>PO/Order/Delivery ยังอยู่ในลำดับพัฒนาถัดไป</li></ul></section>
    </main>
  );
}
