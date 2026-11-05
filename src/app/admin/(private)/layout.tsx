import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/features/admin/actions";
import { AdminNavigation, AdminQuickBar } from "@/components/admin/navigation";
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  const account = <div className="border-t border-white/15 pt-4"><p className="break-words text-sm">{profile.full_name}</p><p className="text-xs text-white/70">{profile.role}</p><form action={logout}><button className="mt-3 min-h-11 rounded-lg border border-white/40 px-4 py-2 text-sm">Cerrar sesión</button></form></div>;
  return <div className="admin-shell min-h-dvh bg-surface lg:grid lg:grid-cols-[250px_1fr]"><a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3">Saltar al contenido</a>
    <aside className="bg-navy-700 p-4 text-white sm:p-5 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin" className="text-xl font-bold tracking-wide">IRON MALLAS<span className="block text-xs text-orange-300">GESTIÓN COMERCIAL</span></Link>
        <Link href="/admin/leads/whatsapp" className="min-h-11 rounded-xl bg-green-600 px-3 py-2.5 text-xs font-semibold lg:hidden">+ Lead WhatsApp</Link>
      </div>
      <details data-close-on-nav className="mt-4 lg:hidden"><summary className="min-h-11 cursor-pointer rounded-xl border border-white/30 p-3 text-sm">Menú</summary><nav aria-label="Administración móvil" className="mt-3 grid gap-3"><AdminNavigation />{account}</nav></details>
      <nav aria-label="Administración" className="my-6 hidden lg:block"><AdminNavigation /></nav>
      <div className="mt-auto hidden lg:block"><Link href="/admin/leads/whatsapp" className="mb-4 flex min-h-11 items-center justify-center rounded-xl bg-green-600 px-3 text-sm font-semibold">+ Lead desde WhatsApp</Link>{account}</div>
    </aside>
    <main id="admin-main" className="min-w-0 p-4 pb-28 sm:p-8 sm:pb-28 lg:p-10">{children}</main>
    <nav aria-label="Accesos rápidos móviles" className="admin-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-1 border-t border-line bg-white/95 px-2 pt-2 shadow-card backdrop-blur lg:hidden"><AdminQuickBar /></nav>
  </div>;
}
