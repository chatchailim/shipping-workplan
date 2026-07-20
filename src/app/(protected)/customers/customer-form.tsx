"use client";

import { useActionState } from "react";
import { createCustomerAction, type CustomerState } from "./actions";

const initialState: CustomerState = {};

export function CustomerForm() {
  const [state, action, pending] = useActionState(createCustomerAction, initialState);
  return (
    <form action={action} className="entity-form">
      <h2>เพิ่มลูกค้า</h2>
      <label>รหัสลูกค้า<input name="customerCode" required maxLength={40} /></label>
      <label>ชื่อบริษัท<input name="companyName" required maxLength={200} /></label>
      <label>เงื่อนไขชำระเงิน<input name="paymentTerms" defaultValue="Net30" required /></label>
      <label>ผู้ติดต่อ<input name="contactName" /></label>
      <label>อีเมล<input name="email" type="email" /></label>
      <label>โทรศัพท์<input name="phone" /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.ok && <p className="form-success" role="status">บันทึกลูกค้าแล้ว</p>}
      <button disabled={pending} type="submit">{pending ? "กำลังบันทึก…" : "บันทึกลูกค้า"}</button>
    </form>
  );
}
