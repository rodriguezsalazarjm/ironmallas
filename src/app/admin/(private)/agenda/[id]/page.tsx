import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth";
import {date} from "@/features/admin/data";
import {AppointmentForm} from "@/features/appointments/forms";
import {appointmentOptions} from "@/features/appointments/data";
import {appointmentLabels,appointmentStatuses,ZONE_OPTIONS} from "@/features/appointments/schema";
import {AssessmentPanel,loadAssessment} from "@/features/assessments/panel";
import {PageHeading,Panel,primaryClass,secondaryClass} from "@/features/crm/ui";
import {dayKeyOf} from "@/features/agenda/calendar";

const sourceLabels={admin:"Panel administrativo",cal_booking:"Reserva web (Cal.com)",web:"Formulario web"} as const;
const syncLabels={none:"Sin reserva externa",synced:"Sincronizada con Cal.com",pending:"Pendiente de sincronización",failed:"Falló la sincronización"} as const;
export default async function AppointmentPage({params}:PageProps<"/admin/agenda/[id]">){
  const {db}=await requireAdmin();const {id}=await params;
  if(!z.uuid().safeParse(id).success) notFound();
  const [appointment,options]=await Promise.all([db.from("appointments").select("*").eq("id",id).maybeSingle(),appointmentOptions()]);
  if(appointment.error) throw new Error("No se pudo cargar la cita."); if(!appointment.data) notFound();
  const a=appointment.data;
  const linked=await db.from("installations").select("id").eq("appointment_id",id).limit(1);
  if(linked.error)throw new Error("No se pudo comprobar la instalación vinculada.");
  if(linked.data.length)return <><PageHeading title="Cita vinculada a instalación" description="El horario, responsable y estado actuales se gestionan desde el trabajo para evitar fechas divergentes."/><Link className="inline-flex min-h-11 items-center text-navy-700 underline" href={`/admin/instalaciones/${linked.data[0].id}`}>Abrir ficha de instalación</Link></>;
  const [contact,quotes,audit,notices,assessment]=await Promise.all([
    db.from("contacts").select("id,name,phone,email,whatsapp").eq("id",a.contact_id).single(),
    db.from("quotes").select("id,number,status,total").eq("appointment_id",id).order("created_at"),
    db.from("audit_logs").select("id,action,created_at,actor_id,changes").eq("entity","appointments").eq("entity_id",id).order("created_at",{ascending:false}).limit(30),
    db.from("notifications").select("id,kind,status,send_after,sent_at,payload,last_error").eq("entity","appointment").eq("entity_id",id).order("created_at",{ascending:false}).limit(30),
    loadAssessment("appointment",id),
  ]);
  if(contact.error||quotes.error||audit.error||notices.error)throw new Error("No se pudo cargar la ficha completa.");
  const quoteIds=quotes.data.map(q=>q.id);
  const jobs=quoteIds.length?await db.from("installations").select("id,status,scheduled_at,quote_id").in("quote_id",quoteIds):{data:[],error:null};
  if(jobs.error)throw new Error("No se pudieron cargar las instalaciones asociadas.");
  const names=Object.fromEntries(options.profiles.map(p=>[p.id,p.full_name]));
  const duration=Math.round((Date.parse(a.ends_at)-Date.parse(a.starts_at))/60000);
  return <><Link href={`/admin/agenda?view=day&date=${dayKeyOf(a.starts_at)}`} className="mb-4 inline-block text-sm underline">← Agenda</Link>
    <PageHeading title={`${appointmentLabels[a.kind]} · ${contact.data.name}`} description={`ID ${a.id.slice(0,8)} · ${appointmentStatuses[a.status]} · ${a.attendance_status==="confirmed"?`asistencia confirmada ${date(a.attendance_confirmed_at)}`:"confirmación de asistencia pendiente"}`}>
      <Link className={primaryClass} href={`/admin/cotizaciones/nueva?contact=${a.contact_id}${a.lead_id?`&lead=${a.lead_id}`:""}&appointment=${a.id}`}>Crear cotización con estas medidas</Link>
    </PageHeading>
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="grid min-w-0 gap-6">
        <Panel title="Identificación y programación"><dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold">Cliente</dt><dd><Link className="underline" href={`/admin/clientes/${a.contact_id}`}>{contact.data.name}</Link></dd></div>
          <div><dt className="font-semibold">Teléfono / WhatsApp</dt><dd>{contact.data.phone||contact.data.whatsapp||"Sin registro"}</dd></div>
          <div><dt className="font-semibold">Correo</dt><dd>{contact.data.email||"Sin correo (no recibirá avisos)"}</dd></div>
          <div><dt className="font-semibold">Dirección</dt><dd>{a.address} · {a.commune}</dd></div>
          <div><dt className="font-semibold">Edificio · Depto · Piso</dt><dd>{[a.building,a.unit&&`Depto ${a.unit}`,a.floor&&`Piso ${a.floor}`].filter(Boolean).join(" · ")||"Sin registro"}</dd></div>
          <div><dt className="font-semibold">Referencias de acceso</dt><dd className="whitespace-pre-wrap">{a.access_notes||"Sin registro"}</dd></div>
          <div><dt className="font-semibold">Fecha y hora</dt><dd>{date(a.starts_at)} · {duration} min</dd></div>
          <div><dt className="font-semibold">Técnico</dt><dd>{a.technician_id?names[a.technician_id]??"Técnico inactivo":"Sin asignar"}</dd></div>
          <div><dt className="font-semibold">Zona principal</dt><dd>{a.zone_kind?ZONE_OPTIONS[a.zone_kind]:"Por definir"}</dd></div>
          <div><dt className="font-semibold">Origen</dt><dd>{sourceLabels[a.source]} · creada {date(a.created_at)}</dd></div>
          {a.cal_booking_uid&&<div className="sm:col-span-2"><dt className="font-semibold">Cal.com</dt><dd>{syncLabels[a.cal_sync_status]}{a.cal_synced_at?` · ${date(a.cal_synced_at)}`:""}{a.cal_sync_error&&<span className="block text-red-700">{a.cal_sync_error}</span>}</dd></div>}
        </dl></Panel>
        <Panel title="Editar visita">{a.cal_booking_uid&&<p className="mb-4 rounded-xl bg-navy-50 p-3 text-sm">Reserva de Cal.com: al cambiar horario o cancelar, primero se actualiza Cal.com mediante su API. Si Cal.com falla, la agenda interna no cambia.</p>}<AppointmentForm {...options} appointment={a}/></Panel>
        <AssessmentPanel target="appointment" targetId={id} assessment={assessment} defaultZone={a.zone_kind}/>
      </div>
      <aside className="grid min-w-0 content-start gap-6">
        <Panel title="Relación comercial"><ul className="grid gap-2 text-sm">
          <li>Oportunidad: {a.lead_id?<Link className="underline" href={`/admin/leads/${a.lead_id}`}>ver oportunidad</Link>:"sin vincular"}</li>
          {quotes.data.map(q=><li key={q.id}>Cotización <Link className="underline" href={`/admin/cotizaciones/${q.id}`}>#{q.number}</Link> · {q.status} · ${q.total.toLocaleString("es-CL")}
            {jobs.data.filter(j=>j.quote_id===q.id).map(j=><span key={j.id} className="block pl-3">↳ <Link className="underline" href={`/admin/instalaciones/${j.id}`}>Instalación</Link> · {j.status}{j.scheduled_at?` · ${date(j.scheduled_at)}`:""}</span>)}
            {q.status==="accepted"&&!jobs.data.some(j=>j.quote_id===q.id)&&<Link className={`${secondaryClass} mt-2 w-full`} href={`/admin/instalaciones/nueva?quote=${q.id}`}>Programar instalación</Link>}</li>)}
          {!quotes.data.length&&<li className="text-ink-soft">Sin cotizaciones generadas desde esta visita.</li>}
        </ul></Panel>
        <Panel title="Avisos por correo">{!notices.data.length?<p className="text-sm text-ink-soft">Sin avisos en cola.</p>:<ul className="grid gap-2 text-xs">{notices.data.map(n=><li key={n.id} className="border-t border-line pt-2"><strong>{noticeLabels[n.kind]??n.kind}</strong> · {(n.payload as {audience?:string})?.audience==="admin"?"administrador":"cliente"} · {noticeStatus[n.status]} {n.status==="pending"?`desde ${date(n.send_after)}`:n.sent_at?date(n.sent_at):""}{n.last_error&&<span className="block text-ink-soft">{n.last_error}</span>}</li>)}</ul>}
          <p className="mt-3 text-xs text-ink-soft">“Aceptado por el proveedor” no garantiza la entrega en la bandeja del cliente.</p></Panel>
        <Panel title="Historial de cambios">{!audit.data.length&&<p className="text-sm">Sin cambios registrados.</p>}<ul className="grid gap-2 text-xs">{audit.data.map(e=><li key={e.id} className="border-t border-line pt-2">{({insert:"Creación",update:"Modificación",delete:"Eliminación"} as Record<string,string>)[e.action]??e.action} · {date(e.created_at)} · {e.actor_id?names[e.actor_id]??"Usuario":"Sistema / Cal.com"}{summary(e.changes)}</li>)}</ul></Panel>
      </aside>
    </div></>;
}
const noticeLabels:Record<string,string>={agenda_scheduled:"Confirmación de agenda",agenda_rescheduled:"Cambio de horario",agenda_cancelled:"Cancelación",agenda_reminder:"Recordatorio 24 h"};
const noticeStatus={pending:"pendiente",sent:"aceptado por el proveedor",failed:"falló",cancelled:"anulado"} as const;
function summary(changes:unknown){
  const c=changes as {before?:Record<string,unknown>|null;after?:Record<string,unknown>|null};
  if(!c?.before||!c.after)return null;
  const keys=["starts_at","ends_at","status","technician_id","address","attendance_status","cal_sync_status"].filter(k=>JSON.stringify(c.before![k])!==JSON.stringify(c.after![k]));
  const labels:Record<string,string>={starts_at:"inicio",ends_at:"término",status:"estado",technician_id:"técnico",address:"dirección",attendance_status:"asistencia",cal_sync_status:"sincronización"};
  return keys.length?<span className="block text-ink-soft">Cambió: {keys.map(k=>labels[k]).join(", ")}</span>:null;
}
