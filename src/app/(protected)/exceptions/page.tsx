import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/context";
import { wmsFreshness } from "@/lib/domain/canonical";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ExceptionsPage() {
  const context = await requireAuthContext();
  const branchId = context.activeBranchId ?? undefined;
  const expiryLimit = new Date();
  expiryLimit.setDate(expiryLimit.getDate() + 30);
  const [waitPo, pendingReturns, expiringDrivers, lastSync, inTransit] = await Promise.all([
    prisma.order.count({ where: { branchId, status: "Wait-PO" } }),
    prisma.return.count({ where: { branchId, status: { in: ["Pending", "Received"] } } }),
    prisma.driver.count({ where: { branchId, active: true, licenseExpiry: { lte: expiryLimit } } }),
    prisma.wmsSyncLog.findFirst({ where: { branchId, status: "Completed" }, orderBy: { startedAt: "desc" } }),
    prisma.order.count({ where: { branchId, status: "In Transit" } }),
  ]);
  const freshness = wmsFreshness(lastSync?.completedAt ?? lastSync?.startedAt ?? null, new Date());
  const rows = [
    { issue: "Order waiting for PO", count: waitPo, severity: waitPo ? "High" : "Clear", href: "/orders" },
    { issue: "Returns awaiting resolution", count: pendingReturns, severity: pendingReturns ? "Medium" : "Clear", href: "/returns" },
    { issue: "Driver licences expire within 30 days", count: expiringDrivers, severity: expiringDrivers ? "High" : "Clear", href: "/fleet" },
    { issue: `WMS data: ${freshness}`, count: freshness === "Fresh" ? 0 : 1, severity: freshness === "Stale" || freshness === "Never synced" ? "High" : freshness === "Delayed" ? "Medium" : "Clear", href: "/inventory" },
    { issue: "In-transit stops awaiting POD/failure", count: inTransit, severity: inTransit ? "Medium" : "Clear", href: "/delivery" },
  ];
  return <main className="content-page"><header><p className="home-eyebrow">OPERATIONS CONTROL</p><h1>Exception Workbench</h1><p>จุดรวมรายการที่ต้องติดตาม โดยไม่แทนที่หน้าปฏิบัติงานเดิม</p></header>
    <section><div className="table-scroll"><table><thead><tr><th>Exception</th><th>Count</th><th>Severity</th><th>Owner view</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.issue}><td>{row.issue}</td><td>{row.count}</td><td>{row.severity}</td><td><Link href={row.href}>Open</Link></td></tr>)}
    </tbody></table></div></section>
  </main>;
}
