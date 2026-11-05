"use client";
import Link from "next/link";
import { useActionState,useState } from "react";
import { Plus,Trash2 } from "lucide-react";
import { calculateQuote,clp,parseScaledDecimal,type Rate,type QuoteLineInput } from "./calculation";
import { saveQuote,changeQuoteStatus } from "./actions";
import { sendQuoteEmail } from "./email";
import type { Contact,PricingRule,Quote,QuoteItem,Service } from "@/lib/supabase/database.types";
import type { Commercial } from "@/features/pricing/schema";
const input="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:outline-2 focus:outline-navy-700";
const button="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-700 px-5 py-3 font-semibold text-white disabled:opacity-50";
type Row={key:string;rule:string;width:string;height:string;quantity:string;description:string;location:string};
const blank=(key:string):Row=>({key,rule:"",width:"",height:"",quantity:"1",description:"",location:""});
function line(row:Row):QuoteLineInput{
  return {rule_id:row.rule,width_mm:parseScaledDecimal(row.width||"0",3),height_mm:parseScaledDecimal(row.height||"0",3),quantity_milli:parseScaledDecimal(row.quantity,3),description:row.description,location:row.location};
}
export function QuoteEditor({contacts,rules,services,commercial,superadmin,quote,items,selectedContact,leadId}:{contacts:Contact[];rules:PricingRule[];services:Service[];commercial:Commercial;superadmin:boolean;quote?:Quote;items?:QuoteItem[];selectedContact?:string;leadId?:string}){
  const [rows,setRows]=useState<Row[]>(()=>items?.length?items.map(i=>({key:i.id,rule:i.rule_id??"",width:String((i.width_mm??0)/1000),height:String((i.height_mm??0)/1000),quantity:String(i.quantity_milli/1000),description:i.description,location:i.location??""})):[blank("first")]);
  const [contact,setContact]=useState(quote?.contact_id??selectedContact??"");
  const [discount,setDiscount]=useState(String((quote?.discount_bps??0)/100));
  const [service,setService]=useState("");
  const [localError,setLocalError]=useState("");
  const [state,action,pending]=useActionState(saveQuote,{message:""});
  const change=(key:string,field: keyof Row,value:string)=>setRows(rows.map(row=>row.key===key?{...row,[field]:value}:row));
  let preview:ReturnType<typeof calculateQuote>|undefined,previewError="";
  try{preview=calculateQuote(rows.map(line),rules as Rate[],parseScaledDecimal(discount,2),commercial.tax_bps,superadmin);}catch(error){previewError=error instanceof Error?error.message:"Revisa los conceptos.";}
  if(state.ok&&state.id)return <div className="rounded-2xl border border-green-200 bg-green-50 p-6"><p role="status">{state.message}</p><Link className={`${button} mt-4`} href={`/admin/cotizaciones/${state.id}`}>Abrir cotización y PDF</Link></div>;
  return <form action={form=>{
    try{
      const parsedItems=rows.map(line);const discountBps=parseScaledDecimal(discount,2);
      calculateQuote(parsedItems,rules as Rate[],discountBps,commercial.tax_bps,superadmin);
      form.set("payload",JSON.stringify({contact_id:contact,lead_id:quote?.lead_id??leadId??null,quote_id:quote?.id??null,expected_version:quote?.current_version??null,items:parsedItems,discount_bps:discountBps,notes:String(form.get("notes")??"")}));
      setLocalError("");action(form);
    }catch(error){setLocalError(error instanceof Error?error.message:"Revisa los datos.");}
  }} className="space-y-6">
    <section className="rounded-2xl border border-line bg-white p-5"><h2 className="mb-4 text-xl font-semibold">Cliente</h2><label className="grid gap-2">Contacto<select className={input} value={contact} onChange={e=>setContact(e.target.value)} required disabled={!!quote}><option value="">Selecciona un contacto</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone} · {c.email}</option>)}</select></label>{quote?<p className="mt-3 text-xs text-ink-soft">Una cotización guardada conserva el mismo contacto en todas sus versiones.</p>:<Link href="/admin/clientes/nuevo" className="mt-3 inline-block text-sm underline">Registrar un nuevo contacto</Link>}</section>
    <section className="space-y-4"><h2 className="text-xl font-semibold">Servicios y adicionales</h2><label className="grid gap-1">Filtrar tarifas por servicio<select className={input} value={service} onChange={e=>setService(e.target.value)}><option value="">Todos los servicios y adicionales</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{rows.map((row,index)=>{
      const rule=rules.find(r=>r.id===row.rule);
      return <fieldset key={row.key} className="grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2"><legend className="px-2 font-semibold">Concepto {index+1}</legend>
        <label className="grid gap-1 sm:col-span-2">Tarifa / material<select className={input} value={row.rule} onChange={e=>change(row.key,"rule",e.target.value)} required><option value="">Selecciona una tarifa real</option>{rules.filter(r=>r.active&&(!service||r.service_id===service||r.id===row.rule)).map(r=><option value={r.id} key={r.id}>{r.name}{r.material?` · ${r.material}`:""} · {clp(r.unit_price)} / {r.unit}</option>)}</select></label>
        {rule?.unit==="m2"&&<><label className="grid gap-1">Ancho (metros)<input className={input} inputMode="decimal" type="number" step="0.001" min="0.001" max={10000} value={row.width} onChange={e=>change(row.key,"width",e.target.value)} required/></label><label className="grid gap-1">Alto (metros)<input className={input} inputMode="decimal" type="number" step="0.001" min="0.001" max={10000} value={row.height} onChange={e=>change(row.key,"height",e.target.value)} required/></label></>}
        <label className="grid gap-1">Cantidad{rule?.unit==="hour"?" (horas)":""}<input className={input} type="number" inputMode="decimal" min="0.001" max={1000000} step="0.001" value={row.quantity} onChange={e=>change(row.key,"quantity",e.target.value)} required/></label>
        <label className="grid gap-1">Ubicación del trabajo<input className={input} value={row.location} onChange={e=>change(row.key,"location",e.target.value)} maxLength={240}/></label>
        <label className="grid gap-1 sm:col-span-2">Descripción adicional<input className={input} value={row.description} onChange={e=>change(row.key,"description",e.target.value)} maxLength={500}/></label>
        {preview?.items[index]&&<p className="text-sm text-ink-soft">{preview.items[index].area_m2?`${preview.items[index].area_m2} m² · `:""}Subtotal neto: {clp(preview.items[index].subtotal)}</p>}
        <button type="button" disabled={rows.length===1} onClick={()=>setRows(rows.filter(r=>r.key!==row.key))} className="flex items-center gap-2 justify-self-end text-sm text-red-700 disabled:opacity-40"><Trash2 size={16} aria-hidden="true"/>Quitar concepto</button>
      </fieldset>;
    })}<button className="inline-flex items-center gap-2 rounded-xl border border-navy-700 px-4 py-3 text-navy-700 disabled:opacity-50" type="button" disabled={rows.length>=50} onClick={()=>setRows([...rows,blank(crypto.randomUUID())])}><Plus size={18} aria-hidden="true"/>Añadir servicio o adicional</button></section>
    <section className="grid gap-5 rounded-2xl border border-line bg-white p-5 lg:grid-cols-2"><div className="space-y-4"><label className="grid gap-1">Descuento sobre el subtotal (%)<input className={input} type="number" min={0} max={100} step="0.01" value={discount} onChange={e=>setDiscount(e.target.value)} required/></label><label className="grid gap-1">Observaciones<textarea className={input} name="notes" rows={4} maxLength={3000} defaultValue={quote?.notes??""}/></label></div>
      <div><h2 className="mb-4 text-xl font-semibold">Resumen</h2>{preview?<dl className="grid gap-2">{[["Subtotal",preview.subtotal],["Descuento",preview.discount],["Neto",preview.net],[`IVA (${commercial.tax_bps/100}%)`,preview.tax],["Total CLP",preview.total]].map(([label,value])=><div className="flex justify-between gap-4 border-b border-line py-2" key={label}><dt>{label}</dt><dd className="font-semibold">{clp(Number(value))}</dd></div>)}</dl>:<p className="text-sm text-ink-soft">{previewError}</p>}<p className="mt-4 text-xs text-ink-soft">El servidor recalcula importes desde el tarifario al guardar. Validez: {commercial.validity_days} días. Los precios y condiciones se conservan en cada versión.</p></div>
    </section>
    <p role="status" className="text-sm text-navy-700">{localError||state.message}</p><button className={button} disabled={pending||!preview||!contact}>{pending?"Guardando…":"Guardar borrador y versión"}</button>
  </form>;
}
export function QuoteStatusForm({quote}:{quote:Quote}){
  const [state,action,pending]=useActionState(changeQuoteStatus,{message:""});
  if(["accepted","rejected","expired"].includes(quote.status))return <p className="text-sm text-ink-soft">El presupuesto tiene un estado final y conserva su historial. Para preparar otra propuesta, crea una nueva cotización.</p>;
  return <form action={action} className="grid gap-3"><input type="hidden" name="id" value={quote.id}/><input type="hidden" name="version" value={quote.current_version}/><label className="grid gap-1">Nuevo estado<select className={input} name="status" defaultValue={quote.status}><option value="draft">Borrador</option><option value="sent">Enviada (registro manual)</option><option value="accepted" disabled={quote.status!=="sent"}>Aceptada</option><option value="rejected">Rechazada</option><option value="expired">Vencida</option></select></label><p className="text-xs text-ink-soft">Marca enviada solo después de entregar el presupuesto. Este control no envía WhatsApp ni correo.</p><p role="status" className="text-sm">{state.message}</p><button className={button} disabled={pending}>Actualizar estado</button></form>;
}
export function QuoteEmailForm({quote}:{quote:Quote}){
  const [state,action,pending]=useActionState(sendQuoteEmail,{message:""});
  return <form action={action} className="grid gap-3"><input name="id" type="hidden" value={quote.id}/><input name="version" type="hidden" value={quote.current_version}/><p className="text-xs text-ink-soft">Envía el PDF al correo guardado en esta versión del presupuesto. Requiere Resend configurado y dominio verificado.</p><p role="status" className="text-sm">{state.message}</p><button className={button} disabled={pending||state.ok}>{pending?"Enviando…":"Enviar PDF por correo"}</button></form>;
}
