import { requireAuthContext } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { ProductEditForm } from "./product-edit-form";
import { ProductForm } from "./product-form";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const context = await requireAuthContext();
  const canEdit = hasAnyRole(context.roles, ["CS", "BRANCH_ADMIN"]);
  const items = await prisma.product.findMany({
    where: context.activeBranchId ? { branchId: context.activeBranchId } : undefined,
    orderBy: { erpCode: "asc" },
    take: 100,
  });
  const priceLogs = await prisma.productPriceLog.findMany({
    where: { productId: { in: items.map((item) => item.id) } },
    orderBy: { changedAt: "desc" },
    take: 20,
  });

  return (
    <main className="content-page">
      <header><p className="home-eyebrow">MASTER DATA</p><h1>สินค้า</h1></header>
      <div className="customer-layout">
        <section>
          <h2>รายการ ({items.length})</h2>
          <div className="table-scroll">
            <table>
              <thead><tr><th>ERP Code</th><th>ชื่อ</th><th>Material</th><th>ราคา</th><th>Action</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item.id}>
                <td>{item.erpCode}</td><td>{item.partName}</td><td>{item.material}</td>
                <td>{item.price.toFixed(2)} {item.unit}</td>
                <td>{canEdit && <ProductEditForm product={{ ...item, price: item.price.toString() }} />}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <h2>ประวัติราคา</h2>
          {priceLogs.length === 0 ? <p className="empty-state">ยังไม่มีการเปลี่ยนราคา</p> :
            <div className="table-scroll"><table><thead><tr><th>เวลา</th><th>จาก</th><th>เป็น</th><th>ที่มา</th></tr></thead>
              <tbody>{priceLogs.map((log) => <tr key={log.id}><td>{log.changedAt.toLocaleString("th-TH")}</td><td>{log.oldPrice.toFixed(2)}</td><td>{log.newPrice.toFixed(2)}</td><td>{log.source}</td></tr>)}</tbody></table></div>}
        </section>
        {canEdit ? <ProductForm /> : <aside className="permission-note">ไม่มีสิทธิ์สร้างหรือแก้ไขสินค้า</aside>}
      </div>
    </main>
  );
}
