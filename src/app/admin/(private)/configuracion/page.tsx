import { requireAdmin } from "@/lib/auth";
import { StatusForm } from "@/components/admin/forms";
export default async function SettingsPage() {
  const { db, profile } = await requireAdmin();
  const { data, error } = await db.from("lead_statuses").select("*").order("position");
  if (error) throw new Error("No se pudo cargar la configuración.");
  return <><h1 className="text-3xl font-bold text-navy-700">Configuración</h1><p className="my-4">Estados comerciales · Solo SUPERADMIN puede modificarlos.</p><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map(s => profile.role === "SUPERADMIN" ? <StatusForm key={s.id} status={s} /> : <p className="rounded-xl border border-line bg-white p-5" key={s.id}>{s.position}. {s.name} · {s.active ? "Activo" : "Inactivo"} {s.is_final ? "· Final" : ""}</p>)}</div><p className="mt-6 text-sm text-ink-soft">Usuarios y roles se administran mediante un operador autorizado en Supabase. No existe registro público de administradores.</p></>;
}
