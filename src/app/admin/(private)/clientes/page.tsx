import { requireAdmin } from "@/lib/auth";
export default async function ClientsPage() {
  const { db } = await requireAdmin();
  const { data, error } = await db.from("contacts").select("*").eq("is_client",true).order("created_at",{ ascending:false }).limit(100);
  if (error) throw new Error("No se pudieron cargar los clientes.");
  return <><h1 className="text-3xl font-bold text-navy-700">Clientes</h1><p className="my-4 text-ink-soft">Contactos convertidos en clientes. La conversión a trabajo se habilitará en una fase posterior.</p><div className="grid gap-3">{!data.length && <p className="rounded-2xl border border-line bg-white p-6">Aún no hay clientes registrados. Las solicitudes se gestionan en Oportunidades.</p>}{data.map(c => <article className="rounded-2xl border border-line bg-white p-5" key={c.id}><h2 className="font-semibold">{c.name}</h2><p className="break-words">{c.email} · {c.phone}</p></article>)}</div></>;
}
