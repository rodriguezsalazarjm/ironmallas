import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth";
import {date} from "@/features/admin/data";
import {TaskForm,TaskStatusForm} from "@/features/crm/forms";
import {PageHeading,Panel,primaryClass,secondaryClass} from "@/features/crm/ui";
export default async function ContactPage({params}:PageProps<"/admin/clientes/[id]">){
  const {db}=await requireAdmin(); const {id}=await params;
  if(!z.uuid().safeParse(id).success) notFound();
  const contact=await db.from("contacts").select("*").eq("id",id).maybeSingle();
  if(contact.error) throw new Error("No fue posible cargar el contacto."); if(!contact.data) notFound();
  const c=contact.data;
  const [leads,tasks,appointments,profiles,quotes,installations]=await Promise.all([
    db.from("leads").select("*").eq("contact_id",id).order("created_at",{ascending:false}).limit(100),
    db.from("tasks").select("*").eq("contact_id",id).order("created_at",{ascending:false}).limit(100),
    db.from("appointments").select("*").eq("contact_id",id).order("starts_at",{ascending:false}).limit(30),
    db.from("profiles").select("id,full_name,active").order("full_name"),
    db.from("quotes").select("id,number,status,total,created_at").eq("contact_id",id).order("created_at",{ascending:false}).limit(30),
    db.from("installations").select("id,service,status").eq("contact_id",id).order("created_at",{ascending:false}).limit(30),
  ]);
  if(leads.error || tasks.error || appointments.error || profiles.error || quotes.error || installations.error) throw new Error("No fue posible cargar la ficha comercial completa.");
  const ids=leads.data.map(l=>l.id);
  const activities=ids.length ? await db.from("lead_activities").select("*").in("lead_id",ids).order("created_at",{ascending:false}).limit(100) : {data:[],error:null};
  if(activities.error) throw new Error("No se pudo cargar el historial.");
  return <><Link href="/admin/clientes" className="mb-4 inline-block text-sm underline">← Clientes y contactos</Link><PageHeading title={c.name} description={`${c.is_client?"Cliente":"Contacto"} · Primer contacto: ${date(c.first_contact_at)}`}><div className="flex flex-wrap gap-2"><Link className={secondaryClass} href={`/admin/clientes/${id}/editar`}>Editar datos</Link><Link className={secondaryClass} href={`/admin/cotizaciones/nueva?contact=${id}`}>Nueva cotización</Link><Link className={primaryClass} href={`/admin/leads/nuevo?contact=${id}`}>Nueva oportunidad</Link></div></PageHeading>
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]"><div className="min-w-0 space-y-6"><Panel title="Información de contacto"><dl className="grid gap-4 text-sm sm:grid-cols-2">{[["Teléfono",c.phone],["WhatsApp",c.whatsapp],["Correo",c.email],["Dirección",c.address],["Unidad",c.unit],["Comuna",c.commune],["Región",c.region],["Origen",c.source],["Consentimiento",c.consent?date(c.consent_at):"No registrado"]].map(([key,value])=><div key={key}><dt className="font-semibold text-navy-700">{key}</dt><dd className="mt-1 break-words">{value || "Sin informar"}</dd></div>)}</dl><div className="mt-5 flex flex-wrap gap-3">{(c.whatsapp || c.phone) && <a className={secondaryClass} href={`https://wa.me/${(c.whatsapp || c.phone)!.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>}<a className={secondaryClass} href={`mailto:${c.email}`}>Redactar correo</a>{c.location_url && <a className={secondaryClass} href={c.location_url} target="_blank" rel="noopener noreferrer">Ver ubicación</a>}<a className={secondaryClass} href={`/admin/clientes/${id}/exportar`}>Exportar datos JSON</a></div><p className="mt-5 whitespace-pre-wrap break-words text-sm">{c.notes || "Sin notas internas."}</p></Panel>
    <Panel title="Oportunidades">{!leads.data.length && <p className="text-sm text-ink-soft">Sin oportunidades registradas.</p>}{leads.data.map(l=><Link className="block border-t border-line py-3 text-sm" key={l.id} href={`/admin/leads/${l.id}`}><span className="font-semibold text-navy-700">{l.service}</span><span className="mt-1 block text-ink-soft">{date(l.created_at)} · {l.source}</span></Link>)}</Panel>
    <Panel title="Cotizaciones y trabajos"><div className="space-y-3 text-sm">{!quotes.data.length && <p className="text-ink-soft">No hay cotizaciones.</p>}{quotes.data.map(q=><Link className="block underline" key={q.id} href={`/admin/cotizaciones/${q.id}`}>{q.number} · {q.status}</Link>)}{installations.data.map(i=><Link className="block underline" key={i.id} href={`/admin/instalaciones/${i.id}`}>{i.service} · {i.status}</Link>)}</div></Panel>
    <Panel title="Agenda"><Link className={secondaryClass} href={`/admin/agenda/nueva?contact=${id}`}>Nueva cita</Link>{!appointments.data.length && <p className="mt-4 text-sm text-ink-soft">Sin citas registradas.</p>}{appointments.data.map(a=><Link className="block border-b border-line py-3 text-sm underline" href={`/admin/agenda/${a.id}`} key={a.id}>{a.service} · {date(a.starts_at)} · {a.status}</Link>)}</Panel>
    <Panel title="Actividad del contacto (últimas 100)">{!activities.data?.length && <p className="text-sm text-ink-soft">Sin gestiones registradas.</p>}{activities.data?.map(a=><article className="border-t border-line py-3" key={a.id}><Link className="text-sm font-semibold underline" href={`/admin/leads/${a.lead_id}`}>{a.type} · {date(a.created_at)}</Link><p className="whitespace-pre-wrap break-words text-sm">{a.note}</p></article>)}</Panel></div>
    <div className="min-w-0 space-y-6"><Panel title="Programar seguimiento"><TaskForm contactId={id} leads={leads.data} profiles={profiles.data.filter(p=>p.active)}/></Panel><Panel title="Tareas (últimas 100)">{!tasks.data.length && <p className="text-sm text-ink-soft">Sin tareas. Programa el próximo contacto.</p>}{tasks.data.map(t=><article key={t.id} className="border-t border-line py-4"><h3 className="break-words font-semibold">{t.title}</h3><p className="mt-1 text-sm">{date(t.due_at)}</p><p className="text-xs text-ink-soft">{profiles.data.find(p=>p.id===t.assigned_to)?.full_name || "Sin responsable"}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{t.notes}</p><TaskStatusForm task={t}/></article>)}</Panel></div></div>
  </>;
}
