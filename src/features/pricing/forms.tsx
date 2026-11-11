"use client";
import { useActionState } from "react";
import { company } from "@/content/company";
import { saveCommercial,savePricing } from "./actions";
import type { Commercial } from "./schema";
import type { PricingRule,Service } from "@/lib/supabase/database.types";
const input="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:outline-2 focus:outline-navy-700";
const button="rounded-xl bg-navy-700 px-5 py-3 font-semibold text-white disabled:opacity-50";
export function PricingForm({rule,services}:{rule?:PricingRule;services:Service[]}){
  const [state,action,pending]=useActionState(savePricing,{message:""});
  return <form action={action} className="grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
    <input name="id" type="hidden" value={rule?.id??""}/>
    <label className="grid gap-1 sm:col-span-2">Nombre de la tarifa<input className={input} name="name" defaultValue={rule?.name} required maxLength={160}/></label>
    <label className="grid gap-1">Servicio<select className={input} name="service_id" defaultValue={rule?.service_id??""}><option value="">Adicional / general</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="grid gap-1">Unidad<select className={input} name="unit" defaultValue={rule?.unit??"unit"}><option value="m2">Metro cuadrado (ancho × alto)</option><option value="ml">Metro lineal (ancho + alto)</option><option value="unit">Unidad</option><option value="hour">Hora</option><option value="fixed">Importe fijo</option></select></label>
    <label className="grid gap-1">Precio neto por unidad (CLP)<input className={input} name="unit_price" type="number" min={1} max={2147483647} step={1} defaultValue={rule?.unit_price} required/></label>
    <label className="grid gap-1">Mínimo neto por concepto (CLP)<input className={input} name="min_price" type="number" min={0} max={2147483647} step={1} defaultValue={rule?.min_price??0} required/></label>
    <label className="grid gap-1">Material<input className={input} name="material" defaultValue={rule?.material??""} maxLength={160}/></label>
    <label className="grid gap-1">Recargo (%)<input className={input} name="surcharge" type="number" min={0} max={1000} step="0.01" defaultValue={(rule?.surcharge_bps??0)/100} required/></label>
    <label className="grid gap-1">Descuento máximo autorizado a ADMIN (%)<input className={input} name="maxDiscount" type="number" min={0} max={100} step="0.01" defaultValue={(rule?.max_discount_bps??0)/100} required/></label>
    <label className="flex items-center gap-2"><input name="active" type="checkbox" defaultChecked={rule?.active??true}/>Tarifa activa</label>
    <p role="status" className="text-sm sm:col-span-2">{state.message}</p><button className={button} disabled={pending}>{pending?"Guardando…":"Guardar tarifa"}</button>
  </form>;
}
export function CommercialForm({value}:{value?:Commercial}){
  const [state,action,pending]=useActionState(saveCommercial,{message:""});
  return <form action={action} className="grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
    <label className="grid gap-1">Nombre comercial / razón social<input className={input} name="companyName" defaultValue={value?.company.name ?? company.legalName} required maxLength={160}/></label>
    <label className="grid gap-1">RUT (si corresponde)<input className={input} name="rut" defaultValue={value?.company.rut ?? company.rut} maxLength={30}/></label>
    <label className="grid gap-1 sm:col-span-2">Dirección comercial<input className={input} name="address" defaultValue={value?.company.address ?? company.address} required maxLength={240}/></label>
    <label className="grid gap-1">Correo de contacto<input className={input} name="email" type="email" defaultValue={value?.company.email ?? company.email} required maxLength={120}/></label>
    <label className="grid gap-1">Teléfono<input className={input} name="phone" type="tel" defaultValue={value?.company.phone ?? company.phoneDisplay} required maxLength={30}/></label>
    <label className="grid gap-1">IVA (%)<input className={input} name="tax" type="number" min={0} max={100} step="0.01" defaultValue={value?value.tax_bps/100:19} required/><span className="text-xs text-ink-soft">IVA general 19%. La empresa figura afecta a IVA en el SII; confirmar con el contador cada tipo de operación.</span></label>
    <label className="grid gap-1">Validez (días)<input className={input} name="validityDays" type="number" min={1} max={365} defaultValue={value?.validity_days} required/></label>
    <label className="grid gap-1 sm:col-span-2">Condiciones de pago<textarea className={input} name="paymentTerms" defaultValue={value?.payment_terms} required maxLength={3000} rows={3}/></label>
    <label className="grid gap-1 sm:col-span-2">Garantía aprobada por la empresa (opcional)<textarea className={input} name="warranty" defaultValue={value?.warranty} maxLength={3000} rows={3}/></label>
    <p role="status" className="text-sm sm:col-span-2">{state.message}</p><button className={button} disabled={pending}>{pending?"Guardando…":"Guardar condiciones"}</button>
  </form>;
}
