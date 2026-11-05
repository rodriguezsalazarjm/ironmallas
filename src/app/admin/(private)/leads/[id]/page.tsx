import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { date } from "@/features/admin/data";
import { ActivityForm } from "@/components/admin/forms";
import { AssignmentForm } from "@/features/crm/forms";
import { NextActionForm } from "@/features/leads/whatsapp-form";
import { sourceLabel,SOURCE_CONFIDENCE,CAMPAIGN_ATTRIBUTION,LEGAL_BASIS } from "@/features/leads/sources";
import { quoteStates } from "@/features/quotes/data";
import { clp } from "@/features/quotes/calculation";
export default async function LeadPage({ params, searchParams }: PageProps<"/admin/leads/[id]">) {
  const flags = await searchParams;
  const { db } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const result = await db.from("leads").select("*").eq("id", id).maybeSingle();
  if (result.error) throw new Error("No se pudo cargar la oportunidad.");
  if (!result.data) notFound();
  const lead = result.data;
  const [contact, statuses, activities, profiles, quotes] = await Promise.all([
    db.from("contacts").select("*").eq("id", lead.contact_id).single(),
    db.from("lead_statuses").select("*").order("position"),
    db.from("lead_activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(100),
    db.from("profiles").select("id,full_name,active"),
    db.from("quotes").select("id,number,status,total,current_version,created_at").eq("lead_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (contact.error || statuses.error || activities.error || profiles.error || quotes.error) throw new Error("No se pudo cargar la ficha completa.");
  return <><Link href="/admin/leads" className="underline">← Oportunidades</Link>{flags.nuevo==="1"&&<p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">Oportunidad registrada.</p>}{flags.duplicado==="1"&&<p role="status" className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm">Este número ya tenía una oportunidad abierta reciente: se agregó la nota a su historial en vez de duplicarla.</p>}<h1 className="my-5 text-3xl font-bold text-navy-700">{contact.data.name}</h1>
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]"><div className="min-w-0 space-y-6"><section className="rounded-2xl border border-line bg-white p-6"><h2 className="text-xl font-semibold">{lead.service}</h2>
      <dl className="my-4 grid gap-3 text-sm">{[["Teléfono",contact.data.phone],["Correo",contact.data.email],["Comuna",contact.data.commune],["Dirección",contact.data.address],["Origen",sourceLabel(lead.source)],["Confianza de la fuente",SOURCE_CONFIDENCE[lead.source_confidence]],["Campaña",lead.campaign?`${lead.campaign}${lead.ad_name?` · ${lead.ad_name}`:""} (${CAMPAIGN_ATTRIBUTION[lead.campaign_attribution]})`:CAMPAIGN_ATTRIBUTION[lead.campaign_attribution]],["Base de tratamiento",LEGAL_BASIS[lead.legal_basis]],["Creación",date(lead.created_at)],["Última actividad",date(lead.last_activity_at)],["Consentimiento",date(lead.consent_at)],["Seguimiento",date(lead.next_follow_up_at)]].map(([k,v]) => <div key={k}><dt className="font-semibold">{k}</dt><dd className="break-words">{v || "Sin informar"}</dd></div>)}</dl><p className="whitespace-pre-wrap break-words">{lead.message || "Sin mensaje adicional."}</p>
      <details className="mt-5"><summary>Atribución de la solicitud</summary><dl className="mt-3 text-sm">{Object.entries(lead.tracking).map(([k,v]) => <div className="break-words" key={k}><dt className="font-semibold">{k}</dt><dd>{v}</dd></div>)}</dl></details>
    </section><section className="rounded-2xl border border-line bg-white p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Cotizaciones de esta oportunidad</h2><Link className="rounded-xl bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white" href={`/admin/cotizaciones/nueva?contact=${lead.contact_id}&lead=${lead.id}`}>Generar cotización</Link></div>{!quotes.data.length&&<p className="text-sm text-ink-soft">Aún no hay cotizaciones.</p>}{quotes.data.map(q=><Link key={q.id} href={`/admin/cotizaciones/${q.id}`} className="flex flex-wrap justify-between gap-2 border-t border-line py-3 text-sm"><span className="font-semibold text-navy-700">IM-{String(q.number).padStart(6,"0")} · v{q.current_version} · {quoteStates[q.status]}</span><span>{clp(q.total)}</span></Link>)}</section><section className="rounded-2xl border border-line bg-white p-6"><h2 className="mb-4 text-xl font-semibold">Historial (últimas 100 actividades)</h2>{!activities.data.length && <p>Sin actividades registradas.</p>}{activities.data.map(a => <article key={a.id} className="border-t border-line py-4"><p className="text-sm font-semibold">{a.type} · {date(a.created_at)} · {profiles.data.find(p => p.id === a.responsible_id)?.full_name ?? "Administrador"}</p><p className="whitespace-pre-wrap break-words">{a.note}</p></article>)}</section></div>
    <div className="space-y-6"><section className="h-fit rounded-2xl border border-line bg-white p-6"><div className="mb-4 flex flex-wrap gap-2">{(contact.data.whatsapp||contact.data.phone)&&<a className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-green-600 px-4 text-sm font-semibold text-white" href={`https://wa.me/${(contact.data.whatsapp||contact.data.phone)!.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>}{contact.data.phone&&<a className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-navy-700" href={`tel:+${contact.data.phone.replace(/\D/g,"")}`}>Llamar</a>}</div><NextActionForm id={lead.id} value={lead.next_action}/></section><section className="h-fit rounded-2xl border border-line bg-white p-6"><h2 className="mb-5 text-xl font-semibold">Registrar gestión</h2><ActivityForm lead={lead} statuses={statuses.data} /></section><section className="rounded-2xl border border-line bg-white p-6"><h2 className="mb-5 text-xl font-semibold">Asignación</h2><AssignmentForm lead={lead} profiles={profiles.data.filter(p=>p.active)}/><div className="mt-5 grid gap-3 text-sm"><Link className="underline" href={`/admin/clientes/${lead.contact_id}`}>Ver ficha completa y tareas del contacto</Link><Link className="underline" href={`/admin/agenda/nueva?contact=${lead.contact_id}`}>Agendar visita</Link><Link className="underline" href={`/admin/cotizaciones/nueva?contact=${lead.contact_id}&lead=${lead.id}`}>Generar cotización</Link></div></section></div></div>
  </>;
}
