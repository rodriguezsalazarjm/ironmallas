import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel Iron Mallas" },
  robots: { index: false, follow: false },
};

/**
 * Private admin area. Phase 2 adds Supabase Auth here: session check in
 * `proxy.ts` plus a server-side role check (SUPERADMIN / ADMIN) in this
 * layout before rendering any data.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-surface font-sans text-ink">{children}</div>;
}
