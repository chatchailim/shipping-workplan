"use client";

import { useActionState } from "react";
import { createMovementAction, type InventoryState } from "./actions";

type Option = { id: string; label: string };
export function MovementForm({ products }: { products: Option[] }) {
  const [state, action, pending] = useActionState(createMovementAction, {} as InventoryState);
  return <form action={action} className="entity-form"><h2>บันทึก Stock Movement</h2>
    <label>Product<select name="productId">{products.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>ประเภท<select name="type"><option>Inbound</option><option>Outbound</option><option>Adjustment-In</option><option>Adjustment-Out</option></select></label>
    <label>จำนวน<input name="qty" type="number" min="0.001" step="0.001" required /></label><label>Zone<input name="zone" defaultValue="MAIN" required /></label>
    <label>Reference<input name="referenceId" /></label><label>เหตุผล<input name="note" required /></label>
    {state.error && <p className="form-error">{state.error}</p>}{state.ok && <p className="form-success">บันทึก Movement แล้ว</p>}
    <button disabled={pending}>บันทึก</button>
  </form>;
}
