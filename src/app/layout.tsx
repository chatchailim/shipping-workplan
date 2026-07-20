import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
