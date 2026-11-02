import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {safeSearch} from "@/features/crm/schema";
import {PageHeading,Panel,fieldClass,primaryClass,secondaryClass} from "@/features/crm/ui";
export default async function ClientsPage({searchParams}:PageProps<"/admin/clientes">){
  const {db}=await requireAdmin();const params=await searchParams;
  const q=safeSearch(params.q),commune=safeSearch(params.commune),onlyClients=params.clients === "1";
  const page=Math.max(1,Math.min(10000,Math.floor(Number(params.page)||1)));
  let query=db.from("contacts").select("*",{count:"exact"}).order("name");
  if(q) query=query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  if(commune) query=query.ilike("commune",`%${commune}%`);
  if(onlyClients) query=query.eq("is_client",true);
  const result=await query.range((page-1)*30,page*30-1);
  if(result.error) throw new Error("No se pudieron cargar los contactos.");
  const link=(target:number)=>`/admin/clientes?${new URLSearchParams({q,commune,clients:onlyClients?"1":"",page:String(target)})}`;
  return <><PageHeading title="Clientes y contactos" description="Una ficha por persona, con sus oportunidades, citas, presupuestos e historial."><Link className={primaryClass} href="/admin/clientes/nuevo">Nuevo contacto</Link></PageHeading>
  <form className="mb-6 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 xl:grid-cols-[1fr_220px_auto_auto]"><label className="sr-only" htmlFor="contact-q">Buscar contacto</label><input id="contact-q" className={fieldClass} name="q" defaultValue={q} maxLength={100} placeholder="Nombre, teléfono o correo"/><label className="sr-only" htmlFor="contact-commune">Filtrar por comuna</label><input id="contact-commune" className={fieldClass} name="commune" defaultValue={commune} placeholder="Comuna" maxLength={60}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="clients" value="1" defaultChecked={onlyClients}/> Solo clientes</label><button className={secondaryClass}>Buscar</button></form>
  <p className="mb-4 text-sm text-ink-soft">{result.count ?? 0} contactos · Página {page}</p><Panel title="Directorio">{!result.data.length && <div className="py-6"><p className="text-sm text-ink-soft">No hay contactos para estos filtros.</p><Link className="mt-3 inline-block text-sm underline" href="/admin/clientes/nuevo">Registrar el primer contacto</Link></div>}<div className="grid gap-3 sm:grid-cols-2">{result.data.map(c=><Link key={c.id} href={`/admin/clientes/${c.id}`} className="min-w-0 rounded-xl border border-line p-4 hover:border-navy-500"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-semibold text-navy-700">{c.name}</h2><span className="rounded-full bg-navy-50 px-2 py-1 text-xs text-navy-700">{c.is_client?"Cliente":"Contacto"}</span></div><p className="mt-2 break-words text-sm">{c.phone || "Sin teléfono"} · {c.email}</p><p className="mt-1 text-xs text-ink-soft">{c.commune || "Comuna pendiente"}</p></Link>)}</div></Panel>
  <nav aria-label="Páginas de contactos" className="mt-5 flex gap-3">{page>1 && <Link className={secondaryClass} href={link(page-1)}>Anterior</Link>}{page*30<(result.count ?? 0) && <Link className={secondaryClass} href={link(page+1)}>Siguiente</Link>}</nav></>;
}
