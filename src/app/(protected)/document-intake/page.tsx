import { requireAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { IntakeForm } from "./intake-form";
import { queueErpSubmissionAction, reviewRevisionAction } from "./actions";
export const dynamic = "force-dynamic";

export default async function DocumentIntakePage() {
  const context = await requireAuthContext();
  const where = context.activeBranchId ? { branchId: context.activeBranchId } : undefined;
  const [customers, products, documents, pos] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { companyName: "asc" } }), prisma.product.findMany({ where: { ...where, active: true }, orderBy: { erpCode: "asc" } }),
    prisma.inboundDocument.findMany({ where, orderBy: { createdAt: "desc" }, take: 30 }), prisma.purchaseOrder.findMany({ where, orderBy: { updatedAt: "desc" }, take: 30 }),
  ]);
  const revisions = await prisma.purchaseOrderRevision.findMany({ where: { purchaseOrderId: { in: pos.map((po) => po.id) }, status: "PendingReview" }, orderBy: { createdAt: "desc" } });
  const poMap = new Map(pos.map((po) => [po.id, po]));
  const submissions = await prisma.erpSubmission.findMany({ where: { purchaseOrderId: { in: pos.map((po) => po.id) } }, orderBy: { createdAt: "desc" } });
  return <main className="content-page"><header><p className="home-eyebrow">DOCUMENT INTAKE & REVISION</p><h1>PO Intake Control</h1><p>รับเอกสาร สร้าง Draft ตรวจ Revision และจัดคิว ERP โดยมีคนอนุมัติก่อนทุกครั้ง</p></header>
    <div className="customer-layout"><section><h2>Revision รอ CS ตรวจ ({revisions.length})</h2>{revisions.map((revision) => { const changes = JSON.parse(revision.changeSet) as Array<{ path: string; kind: string; before: unknown; after: unknown }>; return <article className="run-card" key={revision.id}><h3>{poMap.get(revision.purchaseOrderId)?.poNumber} — Revision {revision.revisionNo}</h3><ul>{changes.map((change, index) => <li key={index}><strong>{change.kind}: {change.path}</strong><br/><code>{JSON.stringify(change.before)}</code> → <code>{JSON.stringify(change.after)}</code></li>)}</ul><div className="stop-buttons"><form action={reviewRevisionAction}><input type="hidden" name="id" value={revision.id}/><input type="hidden" name="decision" value="Accepted"/><button>ยอมรับ Revision</button></form><form action={reviewRevisionAction}><input type="hidden" name="id" value={revision.id}/><input type="hidden" name="decision" value="Rejected"/><input name="reason" required placeholder="เหตุผลที่ไม่ยอมรับ"/><button className="danger-button">ไม่ยอมรับ</button></form></div></article>; })}
      <h2>เอกสารล่าสุด</h2><div className="table-scroll"><table><thead><tr><th>เวลา</th><th>ช่องทาง</th><th>ไฟล์/Ref</th><th>สถานะ</th></tr></thead><tbody>{documents.map((document) => <tr key={document.id}><td>{document.createdAt.toLocaleString("th-TH")}</td><td>{document.channel}</td><td>{document.sourceFileName || document.sourceRef || "—"}</td><td>{document.status}</td></tr>)}</tbody></table></div>
      <h2>ERP Submission Control</h2>{pos.map((po) => <form action={queueErpSubmissionAction} key={po.id} className="compact-inline-form"><span>{po.poNumber}</span><input type="hidden" name="poId" value={po.id}/><button>จัดคิว ERP</button></form>)}{submissions.length > 0 && <p className="permission-note">มี {submissions.length} รายการ — สถานะ ManualReview จนกว่าจะกำหนด ERP API/import contract</p>}
    </section><IntakeForm customers={customers.map((item) => ({ id: item.id, label: item.companyName }))} products={products.map((item) => ({ id: item.id, label: `${item.erpCode} — ${item.partName ?? ""}` }))}/></div>
  </main>;
}
