import { requireAuthContext } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { advanceRunAction, approveRunAction, assignStopAction, moveStopAction } from "./actions";
import { RunForm } from "./run-form";
import { StopOutcomeForm } from "./stop-outcome-form";

export const dynamic = "force-dynamic";

export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const context = await requireAuthContext();
  const requestedDate = (await searchParams).date;
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate ?? "") ? requestedDate! : new Date().toISOString().slice(0, 10);
  const day = new Date(`${selectedDate}T00:00:00.000Z`);
  const branchWhere = context.activeBranchId ? { branchId: context.activeBranchId } : undefined;
  const [runs, vehicles, drivers, orders] = await Promise.all([
    prisma.shippingRun.findMany({ where: { ...branchWhere, plannedDate: day }, orderBy: [{ departureTime: "asc" }, { createdAt: "asc" }] }),
    prisma.vehicle.findMany({ where: { ...branchWhere, active: true } }),
    prisma.driver.findMany({ where: { ...branchWhere, active: true } }),
    prisma.order.findMany({ where: { ...branchWhere, status: { in: ["Confirmed", "Ready to Ship"] } }, orderBy: { requiredDate: "asc" } }),
  ]);
  const runIds = runs.map((run) => run.id);
  const stops = await prisma.shippingRunOrder.findMany({ where: { runId: { in: runIds } }, orderBy: [{ runId: "asc" }, { stopSequence: "asc" }] });
  const stopOrders = await prisma.order.findMany({ where: { id: { in: stops.map((stop) => stop.orderId) } } });
  const proofs = await prisma.deliveryProof.findMany({ where: { runOrderId: { in: stops.map((stop) => stop.id) } } });
  const orderMap = new Map(stopOrders.map((order) => [order.id, order]));
  const proofStopIds = new Set(proofs.map((proof) => proof.runOrderId));

  return <main className="content-page"><header><p className="home-eyebrow">DELIVERY DAY BOARD</p><h1>Delivery Runs</h1>
    <form method="get" className="date-filter"><label>วันที่<input name="date" type="date" defaultValue={selectedDate} /></label><button>แสดง Day Board</button></form>
  </header><div className="customer-layout"><section><h2>Runs ({runs.length})</h2>{runs.length === 0 && <p className="empty-state">ไม่มีเที่ยวรถในวันที่เลือก</p>}
    {runs.map((run) => { const runStops = stops.filter((stop) => stop.runId === run.id); return <article className="run-card" key={run.id}>
      <h3>{run.runNumber} — {run.status}</h3><p>{selectedDate} เวลา {run.departureTime || "—"} · Stops {runStops.length} · Approval: {run.approvalStatus}</p>
      {runStops.length > 0 && <ol className="stop-list">{runStops.map((stop, index) => { const order = orderMap.get(stop.orderId); return <li key={stop.id}><div><strong>#{stop.stopSequence} {order?.runNumber ?? "—"}</strong><span>{order?.customerPORef} · Qty {order?.qty.toString()} · {order?.status}</span></div>
        {run.status === "Planned" && run.approvalStatus === "Draft" && <div className="stop-buttons"><form action={moveStopAction}><input name="stopId" type="hidden" value={stop.id} /><input name="direction" type="hidden" value="up" /><button disabled={index === 0}>↑</button></form><form action={moveStopAction}><input name="stopId" type="hidden" value={stop.id} /><input name="direction" type="hidden" value="down" /><button disabled={index === runStops.length - 1}>↓</button></form></div>}
        {run.status === "Dispatched" && order?.status === "In Transit" && <StopOutcomeForm runOrderId={stop.id} />}
        {proofStopIds.has(stop.id) && <span className="pod-badge">POD recorded</span>}
      </li>; })}</ol>}
      {run.status === "Planned" && run.approvalStatus === "Draft" && orders.length > 0 && <form action={assignStopAction}><input type="hidden" name="runId" value={run.id} /><select name="orderId">{orders.map((order) => <option key={order.id} value={order.id}>{order.runNumber} — {order.customerPORef}</option>)}</select><button>เพิ่ม Stop</button></form>}
      {run.status === "Planned" && run.approvalStatus === "Draft" && hasAnyRole(context.roles, ["LOGISTICS", "BRANCH_ADMIN"]) && <form action={approveRunAction}><input type="hidden" name="id" value={run.id}/><button>Logistics ยืนยัน Delivery Plan</button></form>}
      <form action={advanceRunAction}><input type="hidden" name="id" value={run.id} /><button disabled={run.status === "Completed" || (run.status === "Planned" && run.approvalStatus !== "LogisticsConfirmed")}>{run.status === "Planned" ? "เริ่ม Loading" : run.status === "Loading" ? "Dispatch" : run.status === "Dispatched" ? "Complete" : "Completed"}</button></form>
    </article>; })}</section>
    {hasAnyRole(context.roles, ["LOGISTICS", "BRANCH_ADMIN"]) ? <RunForm vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, label: `${vehicle.plate} — ${vehicle.type}` }))} drivers={drivers.map((driver) => ({ id: driver.id, label: driver.name }))} /> : <aside className="permission-note">ไม่มีสิทธิ์สร้าง Run</aside>}
  </div></main>;
}
