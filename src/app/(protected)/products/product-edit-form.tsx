"use client";

import { useActionState } from "react";
import { type ProductState, updateProductAction } from "./actions";

type EditableProduct = {
  id: string;
  partName: string | null;
  material: string;
  color: string;
  dimensions: string;
  weightKg: number;
  price: string;
  unit: string;
  pcsPerPack: number;
};

export function ProductEditForm({ product }: { product: EditableProduct }) {
  const [state, action, pending] = useActionState(updateProductAction, {} as ProductState);
  return (
    <details className="edit-panel">
      <summary>แก้ไข</summary>
      <form action={action} className="entity-form compact-form">
        <input name="id" type="hidden" value={product.id} />
        <label>ชื่อชิ้นส่วน<input name="partName" defaultValue={product.partName ?? ""} required /></label>
        <label>Material<input name="material" defaultValue={product.material} required /></label>
        <label>Color<input name="color" defaultValue={product.color} required /></label>
        <label>Dimensions<input name="dimensions" defaultValue={product.dimensions} required /></label>
        <label>น้ำหนัก (kg)<input name="weightKg" type="number" step="0.001" min="0.001" defaultValue={product.weightKg} required /></label>
        <label>ราคา<input name="price" type="number" step="0.01" min="0" defaultValue={product.price} required /></label>
        <label>หน่วย<input name="unit" defaultValue={product.unit} required /></label>
        <label>ชิ้น/แพ็ก<input name="pcsPerPack" type="number" min="1" defaultValue={product.pcsPerPack} required /></label>
        <label>ที่มาของการแก้ไข<input name="source" defaultValue="Manual catalogue update" required /></label>
        {state.error && <p className="form-error">{state.error}</p>}
        {state.ok && <p className="form-success">บันทึกและสร้างประวัติแล้ว</p>}
        <button disabled={pending}>บันทึกการแก้ไข</button>
      </form>
    </details>
  );
}
