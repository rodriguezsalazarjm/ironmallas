import Link from "next/link";
import { getInbox, date } from "@/features/admin/data";
export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const params = await searchParams;
  const raw = Number(params.page ?? 1);
  const page = Number.isSafeInteger(raw) && raw > 0 && raw < 100000 ? raw : 1;
  const { leads, statuses, contacts, total } = await getInbox(page);
  return <><h1 className="text-3xl font-bold text-navy-700">Oportunidades</h1><p className="my-3 text-ink-soft">{total} solicitudes registradas · Página {page}</p>
    <div className="grid gap-3">{!leads.length && <p className="rounded-2xl border border-line bg-white p-6">No hay oportunidades en esta página.</p>}{leads.map(l => <Link href={`/admin/leads/${l.id}`} key={l.id} className="grid gap-2 rounded-2xl border border-line bg-white p-5 hover:border-navy-500 sm:grid-cols-2"><div><h2 className="font-semibold text-navy-700">{contacts.find(c => c.id === l.contact_id)?.name ?? "Contacto no disponible"}</h2><p className="text-sm">{l.service}</p></div><div className="text-sm sm:text-right"><p>{statuses.find(s => s.id === l.status_id)?.name}</p><p className="text-ink-soft">{date(l.created_at)}</p><p>Seguimiento: {date(l.next_follow_up_at)}</p></div></Link>)}</div>
    <nav aria-label="Páginas de oportunidades" className="mt-6 flex gap-6">{page > 1 && <Link className="underline" href={`/admin/leads?page=${page-1}`}>Anterior</Link>}{page*30 < total && <Link className="underline" href={`/admin/leads?page=${page+1}`}>Siguiente</Link>}</nav>
  </>;
}
