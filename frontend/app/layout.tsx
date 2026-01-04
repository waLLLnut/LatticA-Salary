import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LatticA Salary - Confidential Payroll",
  description: "FHE-powered confidential salary payment system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
