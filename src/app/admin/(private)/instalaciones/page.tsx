import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { date } from "@/features/admin/data";
import { PageHeading, secondaryClass, fieldClass } from "@/features/crm/ui";
import {dashboardPeriod} from "@/features/dashboard/period";
export default async function InstallationsPage({searchParams}:PageProps<"/admin/instalaciones">) {
  const {db}=await requireAdmin();
  const params=await searchParams;const status=typeof params.status==="string"&&Object.hasOwn(labels,params.status)?params.status as keyof typeof labels:null;
  let query=db.from("installations").select("*").order("created_at",{ascending:false}).limit(100);
  if(status)query=status==="scheduled"?query.in("status",["scheduled","rescheduled"]).gte("scheduled_at",new Date().toISOString()):query.eq("status",status);
  let period:ReturnType<typeof dashboardPeriod>|undefined;let periodError="";
  if(params.from||params.to){try{period=dashboardPeriod(params.from,params.to);const column=status==="completed"?"completed_at":status==="scheduled"?"scheduled_at":"created_at";query=query.gte(column,period.from).lt(column,period.to);}catch{periodError="Período inválido. Se muestran trabajos sin filtrar por fecha.";}}
  const jobs=await query;
  if(jobs.error)throw new Error("No se pudieron cargar los trabajos.");
  const contactIds=[...new Set(jobs.data.map(job=>job.contact_id))];
  const contacts=contactIds.length?await db.from("contacts").select("id,name").in("id",contactIds):{data:[],error:null};
  if(contacts.error)throw new Error("No se pudieron cargar los trabajos.");
  return <><PageHeading title="Instalaciones" description="Trabajos aprobados, evidencias privadas, garantías y pagos."><Link className={secondaryClass} href="/admin/instalaciones/nueva">Nueva instalación</Link></PageHeading><form className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4"><label className="grid gap-1 text-sm">Estado<select name="status" className={fieldClass} defaultValue={status??""}><option value="">Todos</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{value==="scheduled"?"Programadas y reprogramadas próximas":label}</option>)}</select></label><label className="grid gap-1 text-sm">Desde<input type="date" name="from" className={fieldClass} defaultValue={period?.fromDate}/></label><label className="grid gap-1 text-sm">Hasta<input type="date" name="to" className={fieldClass} defaultValue={period?.toDate}/></label><button className={secondaryClass}>Filtrar trabajos</button><Link href="/admin/instalaciones" className={secondaryClass}>Limpiar filtros</Link><Link href="/admin/agenda" className={secondaryClass}>Ver agenda unificada</Link></form>{periodError&&<p role="alert" className="mb-4 text-sm text-red-700">{periodError}</p>}<div className="grid gap-3">{!jobs.data.length&&<p className="rounded-2xl border border-line bg-white p-6">No hay instalaciones con estos filtros. Limpia los filtros o crea un trabajo desde una cotización aceptada.</p>}{jobs.data.map(i=><Link href={`/admin/instalaciones/${i.id}`} key={i.id} className="grid gap-2 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2"><div><h2 className="font-semibold text-navy-700">{contacts.data.find(c=>c.id===i.contact_id)?.name??"Cliente"}</h2><p className="text-sm">{i.service} · {i.commune}</p></div><div className="text-sm sm:text-right"><p>{labels[i.status]}</p><p>{date(i.scheduled_at)}</p><p>Pago: {paymentLabels[i.payment_status]}</p></div></Link>)}</div><p className="mt-4 text-xs text-ink-soft">Últimos 100 trabajos.</p></>;
}
const labels={pending:"Pendiente",scheduled:"Programada",in_progress:"En proceso",completed:"Finalizada",cancelled:"Cancelada",rescheduled:"Reprogramada"};
const paymentLabels={unpaid:"Sin pagos",partial:"Parcial",paid:"Pagada"};
