"use client";
import { useActionState } from "react";
import { ingestDocumentAction, type IntakeState } from "./actions";
type Option = { id: string; label: string };
export function IntakeForm({ customers, products }: { customers: Option[]; products: Option[] }) {
  const [state, action, pending] = useActionState(ingestDocumentAction, {} as IntakeState);
  return <form action={action} className="entity-form"><h2>รับ PO / Shipping Plan</h2>
    <label>ช่องทาง<select name="channel"><option value="MANUAL_UPLOAD">Manual upload</option><option value="GMAIL">Gmail</option><option value="LINE">LINE OA</option></select></label>
    <label>ชื่อไฟล์<input name="sourceFileName" placeholder="customer-po.xlsx" /></label><label>Source reference<input name="sourceRef" placeholder="message id / Drive link" /></label><label>ผู้ส่ง<input name="sender" /></label><label>Checksum<input name="checksum" placeholder="optional SHA-256" /></label>
    <label>เลข PO<input name="poNumber" required /></label><label>ลูกค้า<select name="customerId">{customers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>วันที่ PO<input name="poDate" type="date" required /></label>
    <label>สินค้า<select name="productId">{products.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>จำนวน<input name="originalQty" type="number" min="0.001" step="0.001" required /></label><label>หน่วย<input name="unit" defaultValue="pcs" required /></label><label>ราคาต่อหน่วย<input name="unitPrice" type="number" min="0" step="0.01" required /></label>
    <label>วันที่ส่ง<input name="expectedDeliveryDate" type="date" /></label><label>ช่วงเวลา<select name="deliveryTimeSlot"><option value="">—</option><option>Morning</option><option>Afternoon</option><option>Night</option></select></label><label>หมายเหตุ<input name="notes" /></label>
    {state.error && <p className="form-error">{state.error}</p>}{state.message && <p className="form-success">{state.message}</p>}<button disabled={pending}>สร้าง Draft / ตรวจ Revision</button>
  </form>;
}
