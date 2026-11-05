"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
const item=z.object({rule_id:z.uuid(),width_mm:z.number().int().min(0).max(10000000),height_mm:z.number().int().min(0).max(10000000),quantity_milli:z.number().int().min(1).max(1000000000),description:z.string().trim().max(500).optional(),location:z.string().trim().max(240).optional()});
const schema=z.object({contact_id:z.uuid(),lead_id:z.uuid().nullable(),quote_id:z.uuid().nullable(),expected_version:z.number().int().positive().nullable(),items:z.array(item).min(1).max(50),discount_bps:z.number().int().min(0).max(10000),notes:z.string().trim().max(3000)});
export type QuoteState={message:string;id?:string;ok?:boolean};
export async function saveQuote(_:QuoteState,form:FormData):Promise<QuoteState>{
  const {db}=await requireAdmin();
  const raw=form.get("payload");
  if(typeof raw!=="string"||raw.length>100000)return {message:"La cotización no es válida."};
  let value:unknown;
  try{value=JSON.parse(raw);}catch{return {message:"Revisa el detalle de la cotización."};}
  const parsed=schema.safeParse(value);
  if(!parsed.success)return {message:"Revisa cliente, conceptos, cantidades y dimensiones."};
  const d=parsed.data;
  const {data,error}=await db.rpc("save_quote",{p_contact_id:d.contact_id,p_lead_id:d.lead_id,p_quote_id:d.quote_id,p_items:d.items,p_discount_bps:d.discount_bps,p_notes:d.notes,p_expected_version:d.expected_version});
  if(error||!data)return {message:"No se guardó. Comprueba las tarifas y condiciones comerciales. Si otra persona editó esta cotización, recarga la ficha."};
  revalidatePath("/admin/cotizaciones");revalidatePath(`/admin/cotizaciones/${data}`);revalidatePath("/admin");
  return {message:"Borrador guardado con una nueva versión y sus precios originales.",id:data,ok:true};
}
export async function changeQuoteStatus(_:QuoteState,form:FormData):Promise<QuoteState>{
  const {db}=await requireAdmin();
  const parsed=z.object({id:z.uuid(),status:z.enum(["draft","sent","accepted","rejected","expired"]),version:z.coerce.number().int().positive()}).safeParse(Object.fromEntries(form));
  if(!parsed.success)return {message:"Revisa el estado seleccionado."};
  const {id,status,version}=parsed.data;
  const {error}=await db.rpc("set_quote_status",{p_quote_id:id,p_status:status,p_expected_version:version});
  if(error)return {message:"No se cambió el estado. Recarga la ficha y comprueba su versión y vigencia."};
  revalidatePath(`/admin/cotizaciones/${id}`);revalidatePath("/admin/cotizaciones");revalidatePath("/admin");
  return {message:status==="sent"?"Registraste manualmente el envío. Esto no envía mensajes por sí solo.":"Estado actualizado.",ok:true};
}
