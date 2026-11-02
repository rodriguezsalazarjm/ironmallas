import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { date } from "@/features/admin/data";
export default async function Dashboard() {
  const { db } = await requireAdmin();
  const statuses = await db.from("lead_statuses").select("*");
  if (statuses.error) throw new Error("No se pudieron cargar los estados.");
  const open = statuses.data.filter(s => !s.is_final).map(s => s.id);
  const initial = statuses.data.find(s => s.key === "new");
  const [fresh, pending, follow, activities] = await Promise.all([
    db.from("leads").select("id", { count: "exact", head: true }).eq("status_id", initial?.id ?? "00000000-0000-0000-0000-000000000000"),
    db.from("leads").select("id", { count: "exact", head: true }).in("status_id", open),
    db.from("leads").select("id,next_follow_up_at", { count: "exact" }).in("status_id", open).not("next_follow_up_at", "is", null).order("next_follow_up_at").limit(8),
    db.from("lead_activities").select("*").order("created_at", { ascending: false }).limit(8),
  ]);
  if (fresh.error || pending.error || follow.error || activities.error) throw new Error("No se pudo cargar el resumen.");
  return <><h1 className="text-3xl font-bold text-navy-700">Resumen comercial</h1><p className="mt-2 text-ink-soft">Oportunidades, actividad y próximos contactos.</p>
    <div className="my-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Leads nuevos",fresh.count],["Leads pendientes",pending.count],["Seguimientos programados",follow.count],["Cotizaciones","Próxima fase"]].map(([label,value]) => <div key={label} className="rounded-2xl border border-line bg-white p-5"><p className="text-sm text-ink-soft">{label}</p><p className="mt-3 text-2xl font-bold text-navy-700">{value}</p></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border border-line bg-white p-6"><h2 className="mb-4 text-xl font-semibold">Próximos seguimientos</h2>{!follow.data.length && <p>Sin seguimientos programados.</p>}{follow.data.map(l => <Link className="block border-t border-line py-3 underline" href={`/admin/leads/${l.id}`} key={l.id}>{date(l.next_follow_up_at)}</Link>)}</section>
    <section className="rounded-2xl border border-line bg-white p-6"><h2 className="mb-4 text-xl font-semibold">Actividad reciente</h2>{!activities.data.length && <p>Aún no hay actividad comercial registrada.</p>}{activities.data.map(a => <article className="border-t border-line py-3" key={a.id}><Link href={`/admin/leads/${a.lead_id}`} className="font-semibold underline">{a.type} · {date(a.created_at)}</Link><p className="mt-1 whitespace-pre-wrap break-words text-sm">{a.note}</p></article>)}</section></div>
  </>;
}
