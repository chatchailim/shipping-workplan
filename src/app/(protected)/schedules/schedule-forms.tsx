"use client";

import { useActionState } from "react";
import { createOverrideAction, createScheduleAction, generateRunsAction, type ScheduleState } from "./actions";

type Option = { id: string; label: string };

export function ScheduleForm({ vehicles, drivers }: { vehicles: Option[]; drivers: Option[] }) {
  const [state, action, pending] = useActionState(createScheduleAction, {} as ScheduleState);
  return <form action={action} className="entity-form"><h2>สร้างตารางประจำ</h2>
    <label>รถ<select name="vehicleId">{vehicles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>คนขับหลัก<select name="primaryDriverId">{drivers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>รูปแบบ<select name="scheduleType"><option>Daily</option><option>Rotation</option><option>Custom</option></select></label>
    <label>Rotation วันทำงาน<input name="rotationOnDays" type="number" min="1" /></label>
    <label>Rotation วันหยุด<input name="rotationOffDays" type="number" min="1" /></label>
    <label>วันเริ่ม Rotation<input name="rotationStartDate" type="date" /></label>
    <label>วันทำงาน Custom<input name="customWorkingDays" placeholder="MON,TUE,WED,THU,FRI" /></label>
    <label>Runs ต่อวัน<select name="runsPerDay"><option>1</option><option>2</option><option>3</option></select></label>
    <label>เวลา Run 1<input name="run1TimeSlot" type="time" defaultValue="08:00" required /></label>
    <label>เวลา Run 2<input name="run2TimeSlot" type="time" /></label><label>เวลา Run 3<input name="run3TimeSlot" type="time" /></label>
    <label>เริ่มใช้<input name="effectiveFrom" type="date" required /></label><label>สิ้นสุด<input name="effectiveTo" type="date" /></label>
    {state.error && <p className="form-error">{state.error}</p>}{state.ok && <p className="form-success">{state.message}</p>}
    <button disabled={pending}>บันทึกตาราง</button>
  </form>;
}

export function OverrideForm({ assignments, drivers }: { assignments: Option[]; drivers: Option[] }) {
  const [state, action, pending] = useActionState(createOverrideAction, {} as ScheduleState);
  return <form action={action} className="entity-form"><h2>วันหยุด/คนขับแทน</h2>
    <label>Assignment<select name="assignmentId">{assignments.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>วันที่<input name="date" type="date" required /></label>
    <label>ประเภท<select name="overrideType"><option>Off</option><option>Substitute</option></select></label>
    <label>คนขับแทน<select name="substituteDriverId"><option value="">—</option>{drivers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>เหตุผล<input name="reason" required /></label>
    {state.error && <p className="form-error">{state.error}</p>}{state.ok && <p className="form-success">{state.message}</p>}
    <button disabled={pending}>บันทึก Override</button>
  </form>;
}

export function GenerateRunsForm() {
  const [state, action, pending] = useActionState(generateRunsAction, {} as ScheduleState);
  return <form action={action} className="entity-form"><h2>สร้าง Runs รายวัน</h2>
    <label>วันที่<input name="date" type="date" required /></label>
    {state.error && <p className="form-error">{state.error}</p>}{state.ok && <p className="form-success">{state.message}</p>}
    <button disabled={pending}>Generate Runs</button>
  </form>;
}
