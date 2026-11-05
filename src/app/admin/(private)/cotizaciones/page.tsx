import Link from "next/link";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { clp } from "@/features/quotes/calculation";
import { quoteStates } from "@/features/quotes/data";
import { dashboardPeriod } from "@/features/dashboard/period";
import { chileToday } from "@/features/quotes/date";
export default async function QuotesPage({searchParams}:PageProps<"/admin/cotizaciones">){
  const {db}=await requireAdmin();const params=await searchParams;
  const raw=Number(params.page??1);const page=Number.isSafeInteger(raw)&&raw>0&&raw<100000?raw:1;
  const parsedState=z.enum(["draft","sent","accepted","rejected","expired"]).safeParse(params.estado);
  const state=parsedState.success?parsedState.data:"";
  const metric=params.metric==="sent"||params.metric==="awaiting"?params.metric:"";
  let period:ReturnType<typeof dashboardPeriod>|null=null,periodError="";
  if(params.from||params.to){try{period=dashboardPeriod(params.from,params.to);}catch{periodError="El período no es válido; no se aplicó el filtro de fechas.";}}
  let query=db.from("quotes").select("*",{count:"exact"}).order("created_at",{ascending:false}).range((page-1)*30,page*30-1);
  if(state)query=query.eq("status",state);
  if(metric==="sent")query=query.not("sent_at","is",null);
  if(metric==="awaiting")query=query.eq("status","sent").gte("valid_until",chileToday());
  const dateField=metric||state==="sent"?"sent_at":state==="accepted"?"accepted_at":"created_at";
  if(period)query=query.gte(dateField,period.from).lt(dateField,period.to);
  const result=await query;if(result.error)throw new Error("No fue posible cargar las cotizaciones.");
  const ids=[...new Set(result.data.map(q=>q.contact_id))];
  const contacts=ids.length?await db.from("contacts").select("id,name").in("id",ids):{data:[],error:null};
  if(contacts.error)throw new Error("No fue posible cargar los clientes.");
  const pageLink=(p:number)=>`/admin/cotizaciones?${new URLSearchParams({page:String(p),estado:state,metric,from:period?.fromDate??"",to:period?.toDate??""})}`;
  return <><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold text-navy-700">Cotizaciones</h1><Link href="/admin/cotizaciones/nueva" className="rounded-xl bg-navy-700 px-5 py-3 font-semibold text-white">Nueva cotización</Link></div>
    <form className="my-5 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">Estado<select name="estado" defaultValue={state} className="rounded-lg border border-line bg-white p-2"><option value="">Todos</option>{Object.entries(quoteStates).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="grid gap-1 text-sm">Desde<input name="from" type="date" defaultValue={period?.fromDate} className="rounded-lg border border-line bg-white p-2"/></label><label className="grid gap-1 text-sm">Hasta<input name="to" type="date" defaultValue={period?.toDate} className="rounded-lg border border-line bg-white p-2"/></label><label className="grid gap-1 text-sm">Vista<select name="metric" defaultValue={metric} className="rounded-lg border border-line bg-white p-2"><option value="">Todas las cotizaciones</option><option value="sent">Con envío registrado</option><option value="awaiting">Pendientes de aprobación y vigentes</option></select></label><button className="rounded-lg border border-navy-700 px-4 py-2">Filtrar</button><Link className="self-center text-sm underline" href="/admin/tarifario">Tarifario y condiciones</Link></form>
    {periodError&&<p role="alert" className="mb-4 text-sm text-red-700">{periodError}</p>}{period&&<p className="mb-3 text-xs text-ink-soft">Fechas de {dateField==="sent_at"?"envío":dateField==="accepted_at"?"aceptación":"creación"} en Santiago de Chile.</p>}
    <p className="mb-4 text-sm text-ink-soft">{result.count??0} cotizaciones · página {page}</p><div className="grid gap-3">{!result.data.length&&<p className="rounded-2xl border border-line bg-white p-6">Todavía no hay cotizaciones con este filtro. Configura tus precios reales y crea el primer presupuesto.</p>}{result.data.map(q=><Link href={`/admin/cotizaciones/${q.id}`} className="grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2" key={q.id}><div><h2 className="font-semibold text-navy-700">IM-{String(q.number).padStart(6,"0")} · {contacts.data?.find(c=>c.id===q.contact_id)?.name}</h2><p className="text-sm">Versión {q.current_version} · {quoteStates[q.status]}</p></div><p className="text-lg font-semibold sm:text-right">{clp(q.total)}</p></Link>)}</div>
    <nav aria-label="Páginas de cotizaciones" className="mt-6 flex gap-6">{page>1&&<Link href={pageLink(page-1)} className="underline">Anterior</Link>}{page*30<(result.count??0)&&<Link href={pageLink(page+1)} className="underline">Siguiente</Link>}</nav>
  </>;
}
