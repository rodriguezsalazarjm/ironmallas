import Link from "next/link";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { dashboardPeriod } from "@/features/dashboard/period";
import { clp } from "@/features/quotes/calculation";
import { date } from "@/features/admin/data";
import { PageHeading,Panel,fieldClass,secondaryClass } from "@/features/crm/ui";
export default async function PaymentsPage({searchParams}:PageProps<"/admin/pagos">){
  const {db}=await requireAdmin();const params=await searchParams;
  let period,periodError="";try{period=dashboardPeriod(params.from,params.to);}catch{period=dashboardPeriod(undefined,undefined);periodError="Período inválido. Se muestra el mes actual.";}
  const raw=Number(params.page??1),page=Number.isSafeInteger(raw)&&raw>0&&raw<100000?raw:1;
  const [payments,metrics]=await Promise.all([db.from("payments").select("*",{count:"exact"}).gte("paid_at",period.from).lt("paid_at",period.to).order("paid_at",{ascending:false}).range((page-1)*30,page*30-1),db.rpc("dashboard_metrics",{p_from:period.from,p_to:period.to,p_now:new Date().toISOString()})]);
  if(payments.error||metrics.error)throw new Error("No fue posible cargar los pagos.");
  const total=z.object({income:z.number().int().nonnegative()}).safeParse(metrics.data);if(!total.success)throw new Error("No se pudo obtener el total de ingresos.");
  const workIds=[...new Set(payments.data.map(p=>p.installation_id))];
  const works=workIds.length?await db.from("installations").select("id,contact_id,service").in("id",workIds):{data:[],error:null};
  if(works.error)throw new Error("No se pudieron cargar los trabajos.");
  const contactIds=[...new Set(works.data?.map(w=>w.contact_id)??[])];
  const contacts=contactIds.length?await db.from("contacts").select("id,name").in("id",contactIds):{data:[],error:null};if(contacts.error)throw new Error("No se pudieron cargar los clientes.");
  const link=(p:number)=>`/admin/pagos?${new URLSearchParams({from:period.fromDate,to:period.toDate,page:String(p)})}`;
  return <><PageHeading title="Ingresos registrados" description="Pagos recibidos por trabajos, según fecha de pago. No equivalen a facturación tributaria."><Link href="/admin/instalaciones" className={secondaryClass}>Ver instalaciones</Link></PageHeading>
    <form className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4"><label className="grid gap-1 text-sm">Desde<input className={fieldClass} name="from" type="date" defaultValue={period.fromDate} required/></label><label className="grid gap-1 text-sm">Hasta<input className={fieldClass} name="to" type="date" defaultValue={period.toDate} required/></label><button className={secondaryClass}>Filtrar</button></form>{periodError&&<p role="alert" className="mb-4 text-sm text-red-700">{periodError}</p>}
    <div className="mb-6 rounded-2xl border border-line bg-white p-5"><p className="text-sm text-ink-soft">Ingresos del período completo · fechas de Santiago</p><p className="mt-2 text-3xl font-bold text-navy-700">{clp(total.data.income)}</p><p className="mt-2 text-xs text-ink-soft">{payments.count??0} pagos registrados. Los pagos se añaden desde la ficha de cada instalación.</p></div>
    <Panel title="Historial de pagos">{!payments.data.length&&<p className="py-5 text-sm text-ink-soft">No hay pagos registrados en este período.</p>}<div className="grid gap-3">{payments.data.map(payment=>{const work=works.data?.find(w=>w.id===payment.installation_id),contact=contacts.data?.find(c=>c.id===work?.contact_id);return <article className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2" key={payment.id}><div><Link className="font-semibold text-navy-700 underline" href={`/admin/instalaciones/${payment.installation_id}`}>{contact?.name??"Cliente"}</Link><p className="mt-1 text-sm">{work?.service}</p><p className="mt-1 text-xs text-ink-soft">{payment.method}{payment.reference?` · Ref. ${payment.reference}`:""}</p></div><div className="sm:text-right"><p className="text-xl font-semibold text-navy-700">{clp(payment.amount)}</p><p className="mt-1 text-sm">{date(payment.paid_at)}</p></div></article>})}</div></Panel>
    <nav aria-label="Páginas de pagos" className="mt-5 flex gap-3">{page>1&&<Link className={secondaryClass} href={link(page-1)}>Anterior</Link>}{page*30<(payments.count??0)&&<Link className={secondaryClass} href={link(page+1)}>Siguiente</Link>}</nav>
  </>;
}
