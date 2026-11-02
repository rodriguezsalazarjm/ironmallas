import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel Iron Mallas" },
  robots: { index: false, follow: false },
};

async function RequestPanel({ children }: { children: React.ReactNode }) {
  await connection();
  return children;
}
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-surface font-sans text-ink"><Suspense fallback={<p className="p-8" role="status">Cargando panel…</p>}><RequestPanel>{children}</RequestPanel></Suspense></div>;
}
