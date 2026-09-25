import type { Metadata } from "next";
import { inter, mono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Org Map",
  description: "Visual control room for a company run by AI agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
