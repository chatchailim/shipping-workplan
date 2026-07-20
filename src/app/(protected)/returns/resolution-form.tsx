"use client";

import { useActionState } from "react";
import { resolveReturnAction, type ReturnState } from "./actions";

export function ResolutionForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(resolveReturnAction, {} as ReturnState);
  return <form action={action} className="compact-inline-form"><input name="id" type="hidden" value={id} />
    <label>ผลการตรวจ<select name="resolution"><option>Restock</option><option>Scrap</option><option>Replace</option></select></label>
    <label>หมายเหตุ<input name="note" /></label>
    {state.error && <span className="form-error">{state.error}</span>}{state.ok && <span className="form-success">ปิด Return แล้ว</span>}
    <button disabled={pending}>Resolve</button>
  </form>;
}
