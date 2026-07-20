"use client";

import { useActionState } from "react";
import { amendDraftOrderAction, splitDraftOrderAction, type OrderState } from "./actions";

type DraftOrder = {
  id: string;
  qty: string;
  requiredDate: string;
  shippingTimeSlot: string | null;
  priority: string;
};

export function DraftOrderActions({ order }: { order: DraftOrder }) {
  const [amendState, amendAction, amendPending] = useActionState(amendDraftOrderAction, {} as OrderState);
  const [splitState, splitAction, splitPending] = useActionState(splitDraftOrderAction, {} as OrderState);
  return <div className="order-action-stack">
    <details className="edit-panel"><summary>แก้ไข</summary><form action={amendAction} className="entity-form compact-form">
      <input name="id" type="hidden" value={order.id} />
      <label>จำนวน<input name="qty" type="number" step="0.001" min="0.001" defaultValue={order.qty} required /></label>
      <label>วันที่ต้องส่ง<input name="requiredDate" type="date" defaultValue={order.requiredDate} required /></label>
      <label>ช่วงเวลา<select name="shippingTimeSlot" defaultValue={order.shippingTimeSlot ?? ""}><option value="">—</option><option>Morning</option><option>Afternoon</option><option>Night</option></select></label>
      <label>Priority<select name="priority" defaultValue={order.priority}><option>Normal</option><option>Urgent</option><option>VIP</option></select></label>
      {amendState.error && <p className="form-error">{amendState.error}</p>}{amendState.ok && <p className="form-success">แก้ไข Draft แล้ว</p>}
      <button disabled={amendPending}>บันทึก</button>
    </form></details>
    <details className="edit-panel"><summary>แบ่ง Order</summary><form action={splitAction} className="entity-form compact-form">
      <input name="id" type="hidden" value={order.id} />
      <label>จำนวนชุดแรก<input name="firstQty" type="number" step="0.001" min="0.001" max={order.qty} required /></label>
      {splitState.error && <p className="form-error">{splitState.error}</p>}{splitState.ok && <p className="form-success">แบ่งเป็นสอง Draft แล้ว</p>}
      <button disabled={splitPending}>ยืนยันการแบ่ง</button>
    </form></details>
  </div>;
}
