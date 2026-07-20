"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth/context";
import { requireAnyRole } from "@/lib/auth/roles";

export type ProductState = { ok?: boolean; error?: string };
const schema = z.object({ erpCode:z.string().trim().min(1).max(60), partName:z.string().trim().min(2).max(160), material:z.string().trim().min(1).max(80), color:z.string().trim().min(1).max(60), dimensions:z.string().trim().min(1).max(100), weightKg:z.coerce.number().positive(), price:z.coerce.number().nonnegative(), unit:z.string().trim().min(1).max(20), pcsPerPack:z.coerce.number().int().positive() });

export async function createProductAction(_s:ProductState, fd:FormData):Promise<ProductState>{
  const c=await requireAuthContext(); requireAnyRole(c.roles,["CS","BRANCH_ADMIN"]); if(!c.activeBranchId)return{error:"กรุณาเลือกสาขา"};
  const p=schema.safeParse(Object.fromEntries(fd)); if(!p.success)return{error:p.error.issues[0]?.message};
  try{await prisma.$transaction(async tx=>{const item=await tx.product.create({data:{...p.data,branchId:c.activeBranchId!}});await tx.auditLog.create({data:{entityType:"Product",entityId:item.id,action:"CREATE",userId:c.userId,branchId:c.activeBranchId!,after:JSON.stringify({erpCode:item.erpCode})}})});}catch{return{error:"ERP Code ซ้ำหรือข้อมูลไม่ถูกต้อง"};}
  revalidatePath("/products"); return{ok:true};
}
