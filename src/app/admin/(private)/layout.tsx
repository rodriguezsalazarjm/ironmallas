import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/features/admin/actions";
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]"><aside className="bg-navy-700 p-5 text-white lg:min-h-dvh">
    <Link href="/admin" className="text-xl font-bold tracking-wide">IRON MALLAS<span className="block text-xs text-orange-300">GESTIÓN COMERCIAL</span></Link>
    <nav aria-label="Administración" className="my-7 flex flex-wrap gap-2 lg:grid">{[["/admin","Resumen"],["/admin/leads","Oportunidades"],["/admin/clientes","Clientes"],["/admin/configuracion","Configuración"]].map(([href,label]) => <Link className="rounded-xl px-3 py-3 hover:bg-white/10 focus-visible:outline-2" key={href} href={href}>{label}</Link>)}</nav>
    <p className="break-words text-sm">{profile.full_name}</p><p className="text-xs text-white/70">{profile.role}</p><form action={logout}><button className="mt-4 rounded-lg border border-white/40 px-4 py-2 text-sm">Cerrar sesión</button></form>
  </aside><main id="admin-main" className="min-w-0 p-5 sm:p-8 lg:p-10">{children}</main></div>;
}
