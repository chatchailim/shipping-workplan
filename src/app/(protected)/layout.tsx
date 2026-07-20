import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth/context";
import { logoutAction, switchBranchAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const context = await requireAuthContext();
  const branches = await prisma.branch.findMany({
    where: context.canViewAll ? undefined : { id: { in: context.grantedBranchIds } },
    orderBy: { code: "asc" },
  });
  return (
    <div className="protected-shell">
      <aside className="app-sidebar">
        <p className="sidebar-title">เมนูงาน</p>
        <nav aria-label="เมนูหลัก">
          <Link href="/dashboard">ภาพรวม</Link>
          <Link href="/customers">ลูกค้า</Link>
          <Link href="/help">คู่มือ</Link>
        </nav>
      </aside>
      <div className="protected-main">
        <div className="context-bar">
          <form action={switchBranchAction}>
            <label htmlFor="active-branch">สาขาที่ใช้งาน</label>
            <select id="active-branch" name="branchId" defaultValue={context.activeBranchId ?? ""}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} — {branch.name}</option>)}
            </select>
            <button type="submit">เปลี่ยนสาขา</button>
          </form>
          <div className="user-context">
            <span>{context.name}</span>
            <small>{context.roles.join(", ")}</small>
            <form action={logoutAction}><button type="submit" className="text-button">ออกจากระบบ</button></form>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
