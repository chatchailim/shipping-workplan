"use client";

import { useActionState } from "react";
import { deliveryFailedAction, submitPodAction, type DeliveryState } from "./actions";

export function StopOutcomeForm({ runOrderId }: { runOrderId: string }) {
  const [podState, podAction, podPending] = useActionState(submitPodAction, {} as DeliveryState);
  const [failState, failAction, failPending] = useActionState(deliveryFailedAction, {} as DeliveryState);
  return <div className="stop-outcome-grid">
    <form action={podAction} className="compact-inline-form"><input name="runOrderId" type="hidden" value={runOrderId} /><label>ชื่อผู้รับ<input name="recipientName" required /></label>{podState.error && <span className="form-error">{podState.error}</span>}{podState.ok && <span className="form-success">บันทึก POD แล้ว</span>}<button disabled={podPending}>POD สำเร็จ</button></form>
    <form action={failAction} className="compact-inline-form"><input name="runOrderId" type="hidden" value={runOrderId} /><label>เหตุผลส่งไม่สำเร็จ<input name="reason" required /></label>{failState.error && <span className="form-error">{failState.error}</span>}{failState.ok && <span className="form-success">สร้าง Return แล้ว</span>}<button className="danger-button" disabled={failPending}>Delivery Failed</button></form>
  </div>;
}
