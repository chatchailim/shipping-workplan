import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPT Shipping Work Plan",
  description: "Shipping planning and operational control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <header className="app-header">
          <Link className="app-brand" href="/">OPT Shipping Work Plan</Link>
          <nav aria-label="เมนูช่วยเหลือ">
            <Link className="help-button" href="/help" aria-label="เปิดคู่มือการใช้งาน">? Help</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
