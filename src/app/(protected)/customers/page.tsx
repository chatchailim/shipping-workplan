import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/auth/roles";
import { CustomerForm } from "./customer-form";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const context = await requireAuthContext();
  const customers = await prisma.customer.findMany({ where: context.activeBranchId ? { branchId: context.activeBranchId } : undefined, orderBy: { companyName: "asc" }, take: 100 });
  const canCreate = hasAnyRole(context.roles, ["CS", "BRANCH_ADMIN"]);
  return (
    <main className="content-page">
      <header><p className="home-eyebrow">MASTER DATA</p><h1>ลูกค้า</h1><p>รายการถูกจำกัดตามสาขาที่เลือก สูงสุด 100 รายการแรก</p></header>
      <div className="customer-layout">
        <section><h2>รายการลูกค้า ({customers.length})</h2>{customers.length === 0 ? <p className="empty-state">ยังไม่มีลูกค้าในสาขานี้</p> : <div className="table-scroll"><table><thead><tr><th>รหัส</th><th>บริษัท</th><th>Payment</th><th>ผู้ติดต่อ</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td>{customer.customerCode}</td><td>{customer.companyName}</td><td>{customer.paymentTerms}</td><td>{customer.contactName || "—"}</td></tr>)}</tbody></table></div>}</section>
        {canCreate ? <CustomerForm /> : <aside className="permission-note">บทบาทนี้ดูข้อมูลได้ แต่ไม่มีสิทธิ์สร้างลูกค้า</aside>}
      </div>
    </main>
  );
}
