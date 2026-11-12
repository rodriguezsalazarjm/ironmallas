import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {PageHeading,primaryClass,fieldClass} from "@/features/crm/ui";
import {unifiedAgenda,agendaStatuses} from "@/features/appointments/unified";
import {AGENDA_VIEWS,parseKey,rangeTitle,shift,todayKey,viewRange,type AgendaView} from "@/features/agenda/calendar";
import {AgendaBoard} from "@/features/agenda/board";

const LIMIT=2000;
export default async function AgendaPage({searchParams}:PageProps<"/admin/agenda">){
  const {db}=await requireAdmin();const params=await searchParams;
  const one=(v:unknown)=>typeof v==="string"?v:"";
  const view:AgendaView=Object.hasOwn(AGENDA_VIEWS,one(params.view))?one(params.view) as AgendaView:"week";
  const today=todayKey();
  const date=parseKey(one(params.date))?one(params.date):today;
  const kind=["visits","installation"].includes(one(params.kind))?one(params.kind):"";
  const status=Object.hasOwn(agendaStatuses,one(params.status))?one(params.status):"";
  const q=one(params.q).slice(0,80);
  const range=viewRange(view,date);

  const [appointments,jobs,profiles]=await Promise.all([
    db.from("appointments").select("*",{count:"exact"}).gte("starts_at",range.from).lt("starts_at",range.to).order("starts_at").limit(LIMIT),
    db.from("installations").select("*",{count:"exact"}).gte("scheduled_at",range.from).lt("scheduled_at",range.to).order("scheduled_at").limit(LIMIT),
    db.from("profiles").select("id,full_name,active").order("full_name"),
  ]);
  if(appointments.error||jobs.error||profiles.error)throw new Error("No fue posible cargar la agenda.");
  const technician=profiles.data.some(p=>p.id===one(params.technician))||one(params.technician)==="none"?one(params.technician):"";
  const ids=appointments.data.map(a=>a.id);
  const linked=ids.length?await db.from("installations").select("*").in("appointment_id",ids):{data:[],error:null};
  if(linked.error)throw new Error("No fue posible cargar las instalaciones vinculadas.");
  const contactIds=[...new Set([...appointments.data.map(a=>a.contact_id),...jobs.data.map(j=>j.contact_id)])];
  const contacts=contactIds.length?await db.from("contacts").select("id,name,phone").in("id",contactIds):{data:[],error:null};
  if(contacts.error)throw new Error("No se pudieron cargar los clientes de la agenda.");
  const names=Object.fromEntries(contacts.data.map(c=>[c.id,c.name]));
  const entries=unifiedAgenda(appointments.data,[...jobs.data,...linked.data],{from:range.from,to:range.to,status,kind,technician,q,names,now:new Date().toISOString()});
  const truncated=(appointments.count??0)>LIMIT||(jobs.count??0)>LIMIT;
  const base={view,date,kind,status,technician,q};
  const href=(patch:Partial<typeof base>)=>`/admin/agenda?${new URLSearchParams(Object.entries({...base,...patch}).filter(([,v])=>v)).toString()}`;
  const tab="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold";
  return <div className="agenda-shell">
    <PageHeading title="Agenda" description="Visitas técnicas e instalaciones en una sola agenda (hora de Santiago). Las instalaciones se programan con su propia fecha; las citas vinculadas no se duplican.">
      <Link className={primaryClass} href={`/admin/agenda/nueva?start=${date}T09:00`}>Nueva visita</Link>
    </PageHeading>
    <nav aria-label="Vistas de agenda" className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-2xl border border-line bg-white p-1">{Object.entries(AGENDA_VIEWS).map(([key,label])=><Link key={key} aria-current={view===key?"page":undefined} href={href({view:key as AgendaView})} className={`${tab} ${view===key?"bg-navy-700 text-white":"text-navy-700 hover:bg-navy-50"} ${key==="month"||key==="year"?"max-sm:hidden":""}`}>{label}</Link>)}</div>
      <div className="flex items-center gap-1"><Link className={`${tab} border border-line bg-white text-navy-700`} href={href({date:shift(view,date,-1)})} aria-label="Período anterior">←</Link><Link className={`${tab} border border-line bg-white text-navy-700`} href={href({date:today})}>Hoy</Link><Link className={`${tab} border border-line bg-white text-navy-700`} href={href({date:shift(view,date,1)})} aria-label="Período siguiente">→</Link></div>
      <h2 className="font-display text-xl font-semibold capitalize text-navy-700 sm:ml-2">{rangeTitle(view,date)}</h2>
    </nav>
    <form className="mb-5 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" role="search">
      <input type="hidden" name="view" value={view}/><input type="hidden" name="date" value={date}/>
      <label className="grid gap-1 text-sm">Buscar cliente o dirección<input name="q" defaultValue={q} maxLength={80} className={fieldClass} placeholder="Nombre, calle o comuna"/></label>
      <label className="grid gap-1 text-sm">Tipo<select name="kind" defaultValue={kind} className={fieldClass}><option value="">Todos</option><option value="visits">Visitas técnicas</option><option value="installation">Instalaciones</option></select></label>
      <label className="grid gap-1 text-sm">Técnico<select name="technician" defaultValue={technician} className={fieldClass}><option value="">Todos</option><option value="none">Sin asignar</option>{profiles.data.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Estado<select name="status" defaultValue={status} className={fieldClass}><option value="">Todos</option>{Object.entries(agendaStatuses).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
      <div className="flex items-end gap-2"><button className={primaryClass}>Filtrar</button>{(q||kind||status||technician)&&<Link className="inline-flex min-h-11 items-center text-sm underline" href={href({q:"",kind:"",status:"",technician:""})}>Limpiar</Link>}</div>
    </form>
    <AgendaBoard view={view} date={date} today={today} first={range.first} last={range.last} entries={entries} names={names}
      phones={Object.fromEntries(contacts.data.map(c=>[c.id,c.phone??""]))}
      technicians={profiles.data.map(p=>({id:p.id,name:p.full_name,active:p.active}))}/>
    {truncated&&<p className="mt-4 text-sm" role="status">Vista limitada a {LIMIT.toLocaleString("es-CL")} registros por fuente. Usa una vista más acotada (mes, semana o día) para ver todos los eventos.</p>}
  </div>;
}
