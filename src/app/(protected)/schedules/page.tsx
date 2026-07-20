import { requireAuthContext } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { GenerateRunsForm, OverrideForm, ScheduleForm } from "./schedule-forms";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const context = await requireAuthContext();
  const where = context.activeBranchId ? { branchId: context.activeBranchId } : undefined;
  const canManage = hasAnyRole(context.roles, ["LOGISTICS", "BRANCH_ADMIN"]);
  const [assignments, vehicles, drivers] = await Promise.all([
    prisma.driverVehicleAssignment.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.vehicle.findMany({ where: { ...where, active: true }, orderBy: { plate: "asc" } }),
    prisma.driver.findMany({ where: { ...where, active: true }, orderBy: { name: "asc" } }),
  ]);
  const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.plate]));
  const driverMap = new Map(drivers.map((driver) => [driver.id, driver.name]));
  const assignmentOptions = assignments.map((item) => ({ id: item.id, label: `${vehicleMap.get(item.vehicleId) ?? item.vehicleId} — ${driverMap.get(item.primaryDriverId) ?? item.primaryDriverId}` }));

  return <main className="content-page"><header><p className="home-eyebrow">FLEET PLANNING</p><h1>Recurring Schedules</h1><p>กำหนดรถ/คนขับประจำ แล้วสร้างเที่ยวตามวันที่โดยไม่สร้างซ้ำ</p></header>
    <section className="readiness-panel"><h2>Assignments ({assignments.length})</h2><div className="table-scroll"><table><thead><tr><th>รถ</th><th>คนขับ</th><th>รูปแบบ</th><th>Runs</th><th>ช่วงใช้งาน</th></tr></thead>
      <tbody>{assignments.map((item) => <tr key={item.id}><td>{vehicleMap.get(item.vehicleId)}</td><td>{driverMap.get(item.primaryDriverId)}</td><td>{item.scheduleType}{item.customWorkingDays ? ` (${item.customWorkingDays})` : ""}</td><td>{item.runsPerDay}: {item.run1TimeSlot}{item.run2TimeSlot ? `, ${item.run2TimeSlot}` : ""}{item.run3TimeSlot ? `, ${item.run3TimeSlot}` : ""}</td><td>{item.effectiveFrom.toISOString().slice(0, 10)} — {item.effectiveTo?.toISOString().slice(0, 10) ?? "∞"}</td></tr>)}</tbody></table></div></section>
    {canManage ? <div className="three-column-forms"><ScheduleForm vehicles={vehicles.map((item) => ({ id: item.id, label: item.plate }))} drivers={drivers.map((item) => ({ id: item.id, label: item.name }))} /><OverrideForm assignments={assignmentOptions} drivers={drivers.map((item) => ({ id: item.id, label: item.name }))} /><GenerateRunsForm /></div> : <aside className="permission-note">ไม่มีสิทธิ์จัดการตาราง</aside>}
  </main>;
}
