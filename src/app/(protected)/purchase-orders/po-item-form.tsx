"use client";

import { useActionState } from "react";
import { addPoItemAction, type PoState } from "./actions";

type Option = { id: string; label: string };

export function PoItemForm({ poId, products }: { poId: string; products: Option[] }) {
  const [state, action, pending] = useActionState(addPoItemAction, {} as PoState);
  return <details className="edit-panel"><summary>เพิ่มรายการ</summary><form action={action} className="entity-form compact-form">
    <input name="poId" type="hidden" value={poId} />
    <label>Product<select name="productId">{products.map((product) => <option key={product.id} value={product.id}>{product.label}</option>)}</select></label>
    <label>จำนวน<input name="originalQty" type="number" step="0.001" min="0.001" required /></label>
    <label>หน่วย<input name="unit" defaultValue="pcs" required /></label>
    <label>ราคาต่อหน่วย<input name="unitPrice" type="number" step="0.01" min="0" required /></label>
    <label>วันที่ส่ง<input name="expectedDeliveryDate" type="date" /></label>
    <label>ช่วงเวลา<select name="deliveryTimeSlot"><option value="">—</option><option>Morning</option><option>Afternoon</option><option>Night</option></select></label>
    {state.error && <p className="form-error">{state.error}</p>}{state.ok && <p className="form-success">เพิ่มรายการและ Draft Order แล้ว</p>}
    <button disabled={pending}>เพิ่มรายการ PO</button>
  </form></details>;
}
