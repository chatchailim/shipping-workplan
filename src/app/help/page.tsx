import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { HelpViewer } from "@/components/help-viewer";

export const metadata: Metadata = {
  title: "คู่มือการใช้งาน | OPT Shipping Work Plan",
  description: "คู่มือกระบวนการและการใช้งานระบบสำหรับผู้เริ่มต้น",
};

export default async function HelpPage() {
  const markdown = await readFile(path.join(process.cwd(), "README.md"), "utf8");
  return <HelpViewer markdown={markdown} />;
}
