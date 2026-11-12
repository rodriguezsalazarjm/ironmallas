import Link from "next/link";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/admin/action-form";
import { createInstallation } from "@/features/installations/actions";
import { Field, Panel, PageHeading, fieldClass } from "@/features/crm/ui";
import { linearLabel } from "@/features/quotes/quick";
import type { AssessmentZone } from "@/lib/supabase/database.types";
export default async function NewInstallation({ searchParams }: PageProps<"/admin/instalaciones/nueva">) {
  const {db}=await requireAdmin();const params=await searchParams;
  const chosen=z.uuid().safeParse(params.quote);
  const [quotes,users,jobs]=await Promise.all([db.from("quotes").select("id,number,contact_id,total,appointment_id,details").eq("status","accepted").limit(500),db.from("profiles").select("id,full_name").eq("active",true),db.from("installations").select("quote_id").limit(5000)]);
  if(quotes.error||users.error||jobs.error)throw new Error("No se pudieron cargar las cotizaciones.");
  const available=quotes.data.filter(q=>!jobs.data.some(j=>j.quote_id===q.id));
  const contacts=available.length?await db.from("contacts").select("id,name,address,commune,unit").in("id",[...new Set(available.map(q=>q.contact_id))]):{data:[],error:null};
  if(contacts.error)throw new Error("No se pudieron cargar los clientes.");
  const selected=available.find(q=>q.id===(chosen.success?chosen.data:""));
  // Prefill from the accepted quote and its originating visit: no data re-entry.
  const visit=selected?.appointment_id?await db.from("appointments").select("address,commune,building,unit,floor,access_notes,technician_id").eq("id",selected.appointment_id).maybeSingle():null;
  const assessment=selected?.appointment_id?await db.from("technical_assessments").select("*").eq("appointment_id",selected.appointment_id).maybeSingle():null;
  const contact=contacts.data.find(c=>c.id===selected?.contact_id);
  const details=(selected?.details??{}) as {mesh_type?:string;work_address?:string;zones?:AssessmentZone[]};
  const a=assessment?.data;
  const zones=(a?.zones?.length?a.zones:details.zones)??[];
  const dims=zones.map(z=>`${z.quantity} × ${z.kind} ${linearLabel(z.width_mm)} × ${linearLabel(z.height_mm)} m${z.description?` (${z.description})`:""}`).join("; ");
  const d={address:visit?.data?.address??contact?.address??"",commune:visit?.data?.commune??contact?.commune??"",building:visit?.data?.building??"",unit:visit?.data?.unit??contact?.unit??"",floor:visit?.data?.floor??"",access:visit?.data?.access_notes??"",
    technician:visit?.data?.technician_id??"",type:a?.mesh_type??details.mesh_type??"",anchors:a?.anchoring??"",structure:a?.wall_condition??"",dimensions:dims.slice(0,600),location:details.work_address??"",
    notes:[a?.observations,a?.additional_materials&&`Materiales adicionales: ${a.additional_materials}`,(a?.pillars_200||a?.pillars_240)?`Pilares: ${a?.pillars_200??0} × 2,00 m · ${a?.pillars_240??0} × 2,40 m`:"",a?.access_difficulties&&`Acceso: ${a.access_difficulties}`].filter(Boolean).join("\n").slice(0,4000)};
  return <><PageHeading title="Programar instalación" description="Desde una cotización aceptada. El importe aprobado, el cliente y la oportunidad se conservan automáticamente; la fecha queda en la ficha de instalación (fuente única de programación)."/><Link href="/admin/instalaciones" className="mb-5 inline-block underline">← Volver</Link><Panel title="Ficha del trabajo">{!available.length?<p>No hay cotizaciones aceptadas disponibles. <Link href="/admin/cotizaciones" className="underline">Ir a cotizaciones</Link></p>:<>
    {!selected&&<form className="mb-6 flex flex-wrap items-end gap-3"><Field label="Cotización aprobada"><select name="quote" className={fieldClass} required defaultValue="">{<option value="" disabled>Selecciona…</option>}{available.map(q=><option key={q.id} value={q.id}>#{q.number} · {contacts.data.find(c=>c.id===q.contact_id)?.name} · ${q.total.toLocaleString("es-CL")}</option>)}</select></Field><button className="min-h-12 rounded-xl bg-navy-700 px-5 font-semibold text-white">Cargar datos</button></form>}
    {selected&&<ActionForm action={createInstallation} label="Crear y programar instalación">
    <input type="hidden" name="quote" value={selected.id}/>
    <p className="rounded-xl bg-navy-50 p-3 text-sm">Cotización <strong>#{selected.number}</strong> · {contact?.name} · ${selected.total.toLocaleString("es-CL")}{selected.appointment_id?" · datos cargados desde la visita técnica":""}. <Link className="underline" href="/admin/instalaciones/nueva">Cambiar</Link></p>
    <div className="grid gap-4 md:grid-cols-2"><Field label="Dirección"><input name="address" className={fieldClass} required maxLength={240} defaultValue={d.address}/></Field><Field label="Comuna"><input name="commune" className={fieldClass} required maxLength={60} defaultValue={d.commune}/></Field>
      <Field label="Edificio"><input name="building" className={fieldClass} maxLength={120} defaultValue={d.building}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Depto"><input name="unit" className={fieldClass} maxLength={40} defaultValue={d.unit}/></Field><Field label="Piso"><input name="floor" className={fieldClass} maxLength={20} defaultValue={d.floor}/></Field></div>
      <Field label="Referencias de acceso" className="md:col-span-2"><input name="access_notes" className={fieldClass} maxLength={1000} defaultValue={d.access}/></Field>
      <Field label="Fecha y hora (Santiago, opcional)"><input type="datetime-local" name="scheduled" className={fieldClass}/></Field><Field label="Duración estimada en minutos (opcional)"><input type="number" name="duration" min={15} max={1440} step={15} className={fieldClass}/></Field>
      <Field label="Técnico"><select name="technician" className={fieldClass} defaultValue={d.technician}><option value="">Sin asignar</option>{users.data.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select></Field></div>
    <div className="grid gap-4 md:grid-cols-2">{([["type","Tipo de material / servicio",d.type],["color","Color",""],["anchors","Material de anclaje",d.anchors],["structure","Tipo de estructura / muros",d.structure],["dimensions","Dimensiones y superficie",d.dimensions],["location","Ubicación de instalación",d.location]] as const).map(([name,label,value])=><Field key={name} label={label}><input className={fieldClass} name={name} maxLength={name==="dimensions"?600:160} defaultValue={value.slice(0,name==="dimensions"?600:160)}/></Field>)}</div><Field label="Observaciones técnicas"><textarea name="notes" rows={4} className={fieldClass} maxLength={4000} defaultValue={d.notes}/></Field>
  </ActionForm>}</>}</Panel></>;
}
