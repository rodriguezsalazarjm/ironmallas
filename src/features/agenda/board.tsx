"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import {AlertTriangle,CalendarPlus,CheckCircle2,ClipboardCheck,Clock,MapPin,Phone,UserCheck,Wrench,X,XCircle} from "lucide-react";
import {ActionForm} from "@/components/admin/action-form";
import {fieldClass,Field} from "@/features/crm/ui";
import {agendaStatuses,isVisit,type AgendaEntry} from "@/features/appointments/unified";
import {quickSchedule,cancelAgendaEntry} from "@/features/appointments/actions";
import {WEEKDAYS,addDays,dayKeyOf,dayLabel,daysInMonth,monthName,startOfWeek,timeOf,weekday,type AgendaView} from "./calendar";

type Tech={id:string;name:string;active:boolean};
type Props={view:AgendaView;date:string;today:string;first:string;last:string;entries:AgendaEntry[];names:Record<string,string>;phones:Record<string,string>;technicians:Tech[]};
const HOUR_PX=56;
const closed=(e:AgendaEntry)=>e.status==="cancelled"||e.status==="completed";

function KindBadge({entry,compact=false}:{entry:AgendaEntry;compact?:boolean}){
  const visit=isVisit(entry);const Icon=visit?ClipboardCheck:Wrench;
  return <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${visit?"bg-navy-700 text-white":"bg-orange-500 text-white"}`}><Icon className="size-3" aria-hidden="true"/>{compact?(visit?"VT":"INST"):(visit?"Visita técnica":"Instalación")}</span>;
}
function StatusMarks({entry}:{entry:AgendaEntry}){
  return <span className="inline-flex items-center gap-1">
    {entry.status==="cancelled"&&<XCircle className="size-3.5 text-red-700" aria-label="Cancelada"/>}
    {entry.status==="completed"&&<CheckCircle2 className="size-3.5 text-green-700" aria-label="Realizada"/>}
    {entry.attendance_status==="confirmed"&&!closed(entry)&&<UserCheck className="size-3.5 text-green-700" aria-label="Asistencia confirmada"/>}
    {(entry.cal_sync_status==="failed"||entry.cal_sync_status==="pending")&&<AlertTriangle className="size-3.5 text-red-700" aria-label="Sincronización Cal.com pendiente"/>}
  </span>;
}
/** Visits: solid navy border. Installations: orange with diagonal stripes. Shape, label and icon carry meaning, not colour alone. */
function eventClass(entry:AgendaEntry){
  const base=isVisit(entry)?"border-l-4 border-navy-700 bg-navy-50 text-navy-900":"border-l-4 border-dashed border-orange-600 bg-[repeating-linear-gradient(135deg,#fff4ec,#fff4ec_6px,#ffe6d5_6px,#ffe6d5_12px)] text-navy-950";
  return `${base} ${entry.status==="cancelled"?"opacity-60 line-through":""} ${!entry.ends_at?"outline outline-1 outline-dashed outline-ink-soft/40":""}`;
}

export function AgendaBoard(props:Props){
  // Keep only the id: after a server action revalidates, the drawer shows the fresh record (new updated_at).
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const selected=props.entries.find(e=>e.id===selectedId)??null;
  const setSelected=(e:AgendaEntry|null)=>setSelectedId(e?.id??null);
  const byDay=useMemo(()=>{const map=new Map<string,AgendaEntry[]>();for(const e of props.entries){const k=dayKeyOf(e.starts_at);map.set(k,[...(map.get(k)??[]),e]);}return map;},[props.entries]);
  const common={...props,byDay,open:setSelected};
  return <>
    <Legend/>
    {props.view==="day"&&<TimeGrid {...common} days={[props.date]}/>}
    {props.view==="week"&&<WeekView {...common}/>}
    {props.view==="month"&&<MonthView {...common}/>}
    {props.view==="year"&&<YearView {...common}/>}
    {props.view==="list"&&<ListView {...common}/>}
    {!props.entries.length&&<p className="mt-4 rounded-2xl border border-dashed border-line bg-white p-5 text-sm text-ink-soft">No hay eventos registrados en este período con los filtros actuales. Selecciona un horario para crear una visita, o programa un trabajo desde su cotización aceptada.</p>}
    {selected&&<EventDrawer entry={selected} {...props} onClose={()=>setSelected(null)}/>}
  </>;
}
type Common=Props&{byDay:Map<string,AgendaEntry[]>;open:(e:AgendaEntry)=>void};

function Legend(){
  return <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft" aria-label="Leyenda">
    <li className="flex items-center gap-2"><span className="h-4 w-6 rounded border-l-4 border-navy-700 bg-navy-50"/>Visita técnica (VT)</li>
    <li className="flex items-center gap-2"><span className="h-4 w-6 rounded border-l-4 border-dashed border-orange-600 bg-[repeating-linear-gradient(135deg,#fff4ec,#fff4ec_4px,#ffe6d5_4px,#ffe6d5_8px)]"/>Instalación (INST)</li>
    <li className="flex items-center gap-1"><UserCheck className="size-3.5 text-green-700"/>Asistencia confirmada</li>
    <li className="flex items-center gap-1"><AlertTriangle className="size-3.5 text-red-700"/>Sincronización pendiente</li>
    <li className="flex items-center gap-1"><span className="h-3 w-5 rounded outline outline-1 outline-dashed outline-ink-soft"/>Duración por confirmar</li>
  </ul>;
}

function EventChip({entry,names,open,compact=false}:{entry:AgendaEntry;names:Record<string,string>;open:(e:AgendaEntry)=>void;compact?:boolean}){
  return <button type="button" onClick={()=>open(entry)} className={`block w-full min-w-0 rounded-md px-1.5 py-1 text-left text-xs ${eventClass(entry)} hover:ring-2 hover:ring-navy-300 focus-visible:ring-2 focus-visible:ring-orange-500`} aria-label={`${isVisit(entry)?"Visita técnica":"Instalación"} ${timeOf(entry.starts_at)} ${names[entry.contact_id]??"Cliente"} · ${agendaStatuses[entry.status]}`}>
    <span className="flex flex-wrap items-center gap-1"><KindBadge entry={entry} compact/><span className="whitespace-nowrap font-semibold tabular-nums">{timeOf(entry.starts_at)}</span><StatusMarks entry={entry}/></span>
    {!compact&&<span className="mt-0.5 block truncate font-medium">{names[entry.contact_id]??"Cliente"}</span>}
  </button>;
}

function hoursFor(entries:AgendaEntry[]){
  let from=8,to=19;
  for(const e of entries){const h=+timeOf(e.starts_at).slice(0,2);from=Math.min(from,h);const end=e.ends_at?Math.ceil((Date.parse(e.ends_at)-Date.parse(e.starts_at))/3600000)+h:h+1;to=Math.max(to,Math.min(24,end));}
  return {from,to};
}

function TimeGrid({days,byDay,names,technicians,open,today}:Common&{days:string[]}){
  const all=days.flatMap(d=>byDay.get(d)??[]);const {from,to}=hoursFor(all);
  const hours=Array.from({length:to-from},(_,i)=>from+i);
  const scroller=useRef<HTMLDivElement>(null);
  useEffect(()=>{scroller.current?.scrollTo({top:Math.max(0,(Math.min(...all.map(e=>+timeOf(e.starts_at).slice(0,2)),9)-from-1)*HOUR_PX)});},[all,from]);
  return <div className="overflow-hidden rounded-2xl border border-line bg-white">
    <div className="grid border-b border-line bg-navy-50" style={{gridTemplateColumns:`3.5rem repeat(${days.length},minmax(0,1fr))`}}>
      <span/>{days.map(d=><p key={d} className={`px-2 py-2 text-center text-sm font-semibold capitalize ${d===today?"text-orange-700":"text-navy-700"}`}>{dayLabel(d)}<span className="ml-1 text-xs font-normal text-ink-soft">({(byDay.get(d)??[]).length})</span></p>)}
    </div>
    <div ref={scroller} className="max-h-[70vh] overflow-y-auto">
      <div className="relative grid" style={{gridTemplateColumns:`3.5rem repeat(${days.length},minmax(0,1fr))`}}>
        <div>{hours.map(h=><p key={h} className="h-14 border-b border-line pr-2 text-right text-xs text-ink-soft tabular-nums" style={{height:HOUR_PX}}>{String(h).padStart(2,"0")}:00</p>)}</div>
        {days.map(d=><div key={d} className="relative border-l border-line">
          {hours.map(h=><Link key={h} href={`/admin/agenda/nueva?start=${d}T${String(h).padStart(2,"0")}:00`} className="group block border-b border-line hover:bg-orange-50 focus-visible:bg-orange-50" style={{height:HOUR_PX}} aria-label={`Crear visita el ${d} a las ${h}:00`}><CalendarPlus className="m-1 hidden size-4 text-orange-600 group-hover:block group-focus-visible:block" aria-hidden="true"/></Link>)}
          {layout(byDay.get(d)??[]).map(({entry,col,cols})=>{const start=timeOf(entry.starts_at);const minutes=(+start.slice(0,2)-from)*60+ +start.slice(3,5);const length=entry.duration_minutes??45;
            return <button type="button" key={entry.id} onClick={()=>open(entry)} className={`absolute overflow-hidden rounded-lg p-1.5 text-left text-xs shadow-sm ${eventClass(entry)} hover:ring-2 hover:ring-navy-300 focus-visible:ring-2 focus-visible:ring-orange-500`}
              style={{top:minutes*HOUR_PX/60,height:Math.max(30,length*HOUR_PX/60-2),left:`calc(${(col/cols)*100}% + 2px)`,width:`calc(${100/cols}% - 4px)`}}
              aria-label={`${isVisit(entry)?"Visita técnica":"Instalación"} ${start} ${names[entry.contact_id]??"Cliente"}`}>
              <span className="flex flex-wrap items-center gap-1"><KindBadge entry={entry} compact/><span className="font-semibold tabular-nums">{start}{entry.ends_at?`–${timeOf(entry.ends_at)}`:""}</span><StatusMarks entry={entry}/></span>
              <span className="mt-0.5 block truncate font-semibold">{names[entry.contact_id]??"Cliente"}</span>
              <span className="block truncate">{entry.commune} · {technicians.find(t=>t.id===entry.technician_id)?.name??"Sin técnico"}</span>
              {!entry.ends_at&&<span className="block truncate italic">Duración por confirmar</span>}
            </button>;})}
        </div>)}
      </div>
    </div>
  </div>;
}
/** Side-by-side columns for overlapping events (visual only; conflicts are blocked by the database per technician). */
function layout(entries:AgendaEntry[]){
  const sorted=[...entries].sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
  const end=(e:AgendaEntry)=>Date.parse(e.starts_at)+(e.duration_minutes??45)*60000;
  const out:{entry:AgendaEntry;col:number;cols:number}[]=[];let group:typeof out=[];let groupEnd=0;
  const flush=()=>{const cols=Math.max(1,...group.map(g=>g.col+1));group.forEach(g=>{g.cols=cols;out.push(g);});group=[];};
  for(const e of sorted){
    if(group.length&&Date.parse(e.starts_at)>=groupEnd)flush();
    const used=new Set(group.filter(g=>end(g.entry)>Date.parse(e.starts_at)).map(g=>g.col));let col=0;while(used.has(col))col++;
    group.push({entry:e,col,cols:1});groupEnd=Math.max(groupEnd,end(e));
  }
  flush();return out;
}

function WeekView(props:Common){
  const days=Array.from({length:7},(_,i)=>addDays(startOfWeek(props.date),i));
  return <>
    <div className="hidden md:block"><TimeGrid {...props} days={days}/></div>
    <div className="grid gap-3 md:hidden">{days.map(d=><DayCard key={d} day={d} {...props}/>)}</div>
  </>;
}
function DayCard({day,byDay,names,open,today}:Common&{day:string}){
  const items=byDay.get(day)??[];
  return <section className={`rounded-2xl border bg-white p-3 ${day===today?"border-orange-500":"border-line"}`} aria-label={dayLabel(day)}>
    <div className="mb-2 flex items-center justify-between"><h3 className="font-display text-base font-semibold capitalize text-navy-700">{dayLabel(day)}</h3><Link href={`/admin/agenda/nueva?start=${day}T09:00`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-orange-700"><CalendarPlus className="size-4"/>Crear</Link></div>
    {items.length?<div className="grid gap-2">{items.map(e=><EventChip key={e.id} entry={e} names={names} open={open}/>)}</div>:<p className="text-sm text-ink-soft">Sin eventos.</p>}
  </section>;
}

function MonthView({first,last,date,byDay,names,open,today}:Common){
  const days:string[]=[];for(let d=first;d<=last;d=addDays(d,1))days.push(d);
  const month=date.slice(0,7);
  return <div className="overflow-hidden rounded-2xl border border-line bg-line">
    <div className="grid grid-cols-7 gap-px">{WEEKDAYS.map(d=><p key={d} className="bg-navy-50 py-2 text-center text-xs font-semibold text-navy-700">{d}</p>)}
      {days.map(d=>{const items=byDay.get(d)??[];const out=d.slice(0,7)!==month;const visits=items.filter(isVisit).length,jobs=items.length-visits;
        return <div key={d} className={`min-h-28 min-w-0 bg-white p-1.5 ${out?"bg-surface text-ink-soft":""}`}>
          <div className="mb-1 flex items-center justify-between"><Link href={`/admin/agenda?view=day&date=${d}`} className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold ${d===today?"bg-orange-600 text-white":"hover:bg-navy-50"}`} aria-label={`Ver día ${d}`}>{+d.slice(8)}</Link>
            {items.length>0&&<span className="text-[10px] font-semibold text-navy-700" title={`${visits} visitas, ${jobs} instalaciones`}>{visits?`${visits} VT`:""}{visits&&jobs?" · ":""}{jobs?`${jobs} INST`:""}</span>}</div>
          <div className="grid gap-1">{items.slice(0,3).map(e=><EventChip key={e.id} entry={e} names={names} open={open} compact/>)}</div>
          {items.length>3&&<Link href={`/admin/agenda?view=day&date=${d}`} className="mt-1 block text-[11px] font-semibold text-navy-700 underline">+{items.length-3} más</Link>}
          <Link href={`/admin/agenda/nueva?start=${d}T09:00`} className="sr-only focus:not-sr-only focus:text-xs">Crear visita el {d}</Link>
        </div>;})}
    </div>
  </div>;
}

function YearView({date,byDay,today}:Common){
  const year=date.slice(0,4);const max=Math.max(1,...[...byDay.values()].map(v=>v.filter(e=>e.status!=="cancelled").length));
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({length:12},(_,m)=>{
    const key=`${year}-${String(m+1).padStart(2,"0")}-01`;const count=daysInMonth(key);const lead=weekday(key);
    const monthItems=Array.from({length:count},(_,i)=>byDay.get(`${key.slice(0,8)}${String(i+1).padStart(2,"0")}`)??[]).flat().filter(e=>e.status!=="cancelled");
    const visits=monthItems.filter(isVisit).length;
    return <Link key={m} href={`/admin/agenda?view=month&date=${key}`} className="rounded-2xl border border-line bg-white p-3 hover:border-navy-500 focus-visible:ring-2 focus-visible:ring-orange-500">
      <div className="mb-2 flex items-baseline justify-between"><h3 className="font-display text-lg font-semibold capitalize text-navy-700">{monthName(m)}</h3><span className="text-xs text-ink-soft">{visits} VT · {monthItems.length-visits} INST</span></div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">{WEEKDAYS.map(w=><span key={w} className="text-ink-soft">{w[0]}</span>)}{Array.from({length:lead},(_,i)=><span key={`e${i}`}/>)}
        {Array.from({length:count},(_,i)=>{const d=`${key.slice(0,8)}${String(i+1).padStart(2,"0")}`;const n=(byDay.get(d)??[]).filter(e=>e.status!=="cancelled").length;const level=n?Math.ceil(n/max*3):0;
          return <span key={d} title={`${d}: ${n} eventos`} className={`flex aspect-square items-center justify-center rounded ${["","bg-navy-100 text-navy-900","bg-navy-300 text-navy-950","bg-navy-700 text-white"][level]} ${d===today?"ring-2 ring-orange-500":""}`}>{i+1}{n>0&&<span className="sr-only"> ({n})</span>}</span>;})}</div>
    </Link>;})}
    <p className="text-xs text-ink-soft sm:col-span-2 lg:col-span-3 xl:col-span-4">Intensidad = cantidad de eventos activos por día (cancelados excluidos). Selecciona un mes para ver el detalle.</p>
  </div>;
}

function ListView({entries,names,phones,technicians,open}:Common){
  const groups=new Map<string,AgendaEntry[]>();for(const e of entries){const k=dayKeyOf(e.starts_at);groups.set(k,[...(groups.get(k)??[]),e]);}
  return <div className="grid gap-5">{[...groups.entries()].map(([day,items])=><section key={day} aria-label={dayLabel(day)}>
    <h3 className="mb-2 font-display text-lg font-semibold capitalize text-navy-700">{dayLabel(day)}</h3>
    <ul className="grid gap-2">{items.map(e=><li key={e.id} className={`grid gap-3 rounded-xl p-3 sm:grid-cols-[6rem_1fr_auto] sm:items-center ${eventClass(e)}`}>
      <p className="font-semibold tabular-nums">{timeOf(e.starts_at)}{e.ends_at?`–${timeOf(e.ends_at)}`:""}<span className="block text-xs font-normal">{e.duration_minutes?`${e.duration_minutes} min`:"Duración por confirmar"}</span></p>
      <div className="min-w-0"><p className="flex flex-wrap items-center gap-2"><KindBadge entry={e}/><span className="font-semibold">{names[e.contact_id]??"Cliente"}</span><span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">{agendaStatuses[e.status]}</span><StatusMarks entry={e}/></p>
        <p className="mt-1 truncate text-sm"><MapPin className="mr-1 inline size-3.5"/>{e.address} · {e.commune}</p>
        <p className="text-xs text-ink-soft">{technicians.find(t=>t.id===e.technician_id)?.name??"Técnico por asignar"}{phones[e.contact_id]?` · ${phones[e.contact_id]}`:""}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>open(e)} className="min-h-11 rounded-xl bg-navy-700 px-3 text-sm font-semibold text-white">Acciones</button><Link href={e.href} className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-3 text-sm font-semibold text-navy-700">Ficha</Link></div>
    </li>)}</ul>
  </section>)}</div>;
}

function EventDrawer({entry,names,phones,technicians,onClose}:Props&{entry:AgendaEntry;onClose:()=>void}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{ref.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[onClose]);
  const day=dayKeyOf(entry.starts_at);const editable=!closed(entry);const cal=entry.cal_booking_uid!==null;
  return <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/40" onClick={onClose}>
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="agenda-drawer-title" onClick={e=>e.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl outline-none">
      <div className="mb-4 flex items-start justify-between gap-3"><div><KindBadge entry={entry}/><h2 id="agenda-drawer-title" className="mt-2 font-display text-2xl font-semibold text-navy-700">{names[entry.contact_id]??"Cliente"}</h2><p className="text-sm text-ink-soft">{entry.service}</p></div><button type="button" onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-xl border border-line" aria-label="Cerrar"><X className="size-5"/></button></div>
      <dl className="grid gap-2 text-sm">
        <div className="flex gap-2"><Clock className="size-4 shrink-0 text-navy-500"/><dd className="capitalize">{dayLabel(day)} · {timeOf(entry.starts_at)}{entry.ends_at?`–${timeOf(entry.ends_at)}`:" · duración por confirmar"}</dd></div>
        <div className="flex gap-2"><MapPin className="size-4 shrink-0 text-navy-500"/><dd>{entry.address} · {entry.commune}</dd></div>
        {phones[entry.contact_id]&&<div className="flex gap-2"><Phone className="size-4 shrink-0 text-navy-500"/><dd><a className="underline" href={`tel:+${phones[entry.contact_id].replace(/\D/g,"")}`}>{phones[entry.contact_id]}</a></dd></div>}
        <div><dt className="inline font-semibold">Estado: </dt><dd className="inline">{agendaStatuses[entry.status]} · {entry.attendance_status==="confirmed"?"asistencia confirmada":"confirmación pendiente"}</dd></div>
        <div><dt className="inline font-semibold">Técnico: </dt><dd className="inline">{technicians.find(t=>t.id===entry.technician_id)?.name??"Sin asignar"}</dd></div>
        {cal&&<div><dt className="inline font-semibold">Cal.com: </dt><dd className="inline">{({none:"sin vínculo",synced:"sincronizada",pending:"pendiente de sincronización",failed:"falló la última sincronización"})[entry.cal_sync_status]}</dd></div>}
      </dl>
      <nav className="my-5 flex flex-wrap gap-2 text-sm" aria-label="Navegación relacionada">
        <Link className="inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-3 font-semibold text-white" href={entry.href}>Abrir ficha</Link>
        <Link className="inline-flex min-h-11 items-center rounded-xl border border-line px-3 font-semibold text-navy-700" href={`/admin/clientes/${entry.contact_id}`}>Cliente</Link>
        {entry.quote_id&&<Link className="inline-flex min-h-11 items-center rounded-xl border border-line px-3 font-semibold text-navy-700" href={`/admin/cotizaciones/${entry.quote_id}`}>Cotización</Link>}
        {entry.source==="appointment"&&<Link className="inline-flex min-h-11 items-center rounded-xl border border-line px-3 font-semibold text-navy-700" href={`/admin/cotizaciones/nueva?contact=${entry.contact_id}${entry.lead_id?`&lead=${entry.lead_id}`:""}&appointment=${entry.id}`}>Cotizar con medidas</Link>}
      </nav>
      {editable?<>
        <section className="rounded-2xl border border-line p-4"><h3 className="mb-3 font-display text-lg font-semibold text-navy-700">Reprogramar o asignar técnico</h3>
          {cal&&<p className="mb-3 text-xs text-ink-soft">Reserva de Cal.com: el cambio se envía primero a Cal.com; si falla, la agenda no cambia. La duración la fija el tipo de evento de Cal.com.</p>}
          <ActionForm key={`${entry.id}:${entry.updated_at}`} action={quickSchedule} label="Guardar cambio">
            <input type="hidden" name="source" value={entry.source}/><input type="hidden" name="id" value={entry.id}/><input type="hidden" name="updated_at" value={entry.updated_at}/>
            <div className="grid grid-cols-2 gap-3"><Field label="Fecha"><input type="date" name="date" defaultValue={day} required className={fieldClass}/></Field><Field label="Hora"><input type="time" name="time" defaultValue={timeOf(entry.starts_at)} required step={900} className={fieldClass}/></Field></div>
            <Field label={entry.source==="installation"?"Duración estimada (min, opcional)":"Duración (min)"}><input type="number" name="duration" min={15} max={1440} step={15} defaultValue={entry.duration_minutes??""} required={entry.source==="appointment"&&!cal} disabled={cal} className={fieldClass}/></Field>
            {cal&&<input type="hidden" name="duration" value=""/>}
            <Field label="Técnico"><select name="technician" defaultValue={entry.technician_id??""} className={fieldClass}><option value="">Sin asignar</option>{technicians.filter(t=>t.active||t.id===entry.technician_id).map(t=><option key={t.id} value={t.id}>{t.name}{t.active?"":" (inactivo)"}</option>)}</select></Field>
            <Field label="Motivo (se informa al cliente si cambia el horario)"><input name="reason" maxLength={500} className={fieldClass}/></Field>
          </ActionForm></section>
        <section className="mt-4 rounded-2xl border border-red-200 p-4"><h3 className="mb-3 font-display text-lg font-semibold text-red-800">Cancelar</h3>
          <ActionForm key={`cancel:${entry.id}:${entry.updated_at}`} action={cancelAgendaEntry} label="Confirmar cancelación">
            <input type="hidden" name="source" value={entry.source}/><input type="hidden" name="id" value={entry.id}/><input type="hidden" name="updated_at" value={entry.updated_at}/>
            <Field label="Motivo de la cancelación *"><input name="reason" required minLength={3} maxLength={500} className={fieldClass}/></Field>
          </ActionForm></section>
      </>:<p className="rounded-xl bg-surface p-3 text-sm">Evento {agendaStatuses[entry.status].toLowerCase()}: se conserva en el historial y no admite cambios desde la agenda.</p>}
    </div>
  </div>;
}

