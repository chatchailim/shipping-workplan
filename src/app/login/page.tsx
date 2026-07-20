import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ | OPT Shipping Work Plan" };

export default async function LoginPage() {
  if (await getAuthContext()) redirect("/dashboard");
  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="home-eyebrow">SECURE ACCESS</p>
        <h1>เข้าสู่ระบบ</h1>
        <p>ใช้บัญชีที่ผู้ดูแลระบบกำหนด และตรวจสาขาก่อนทำรายการทุกครั้ง</p>
        <LoginForm />
      </section>
    </main>
  );
}
