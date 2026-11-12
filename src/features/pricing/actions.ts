"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { commercialSchema, pricingSchema } from "./schema";
import { parseScaledDecimal } from "@/features/quotes/calculation";
export type PriceState = { message:string; ok?:boolean };
export async function savePricing(_:PriceState,form:FormData):Promise<PriceState> {
  const {db,profile}=await requireAdmin();
  if(profile.role!=="SUPERADMIN") return {message:"Solo SUPERADMIN puede configurar precios."};
  let surcharge:number,discount:number;
  try { surcharge=parseScaledDecimal(String(form.get("surcharge")||"0"),2);discount=parseScaledDecimal(String(form.get("maxDiscount")||"0"),2); }
  catch { return {message:"Revisa los porcentajes del tarifario."}; }
  const parsed=pricingSchema.safeParse({...Object.fromEntries(form),surcharge_bps:surcharge,max_discount_bps:discount,active:form.get("active")==="on"});
  if(!parsed.success)return {message:"Revisa nombre, unidad e importes CLP enteros. El precio debe ser mayor que cero."};
  const {id,service_id,material,...rest}=parsed.data;
  const value={...rest,service_id:service_id||null,material:material||null};
  const result=id ? await db.from("pricing_rules").update(value).eq("id",id).select("id").single() : await db.from("pricing_rules").insert(value).select("id").single();
  if(result.error)return {message:"No se guardó la tarifa. Revisa la conexión y los permisos."};
  revalidatePath("/admin/tarifario");revalidatePath("/admin/cotizaciones");
  return {message:"Tarifa guardada. Las cotizaciones anteriores conservan sus precios.",ok:true};
}
export async function saveCommercial(_:PriceState,form:FormData):Promise<PriceState> {
  const {db,profile}=await requireAdmin();
  if(profile.role!=="SUPERADMIN")return {message:"No tienes permiso para cambiar las condiciones comerciales."};
  let tax:number;
  try{tax=parseScaledDecimal(String(form.get("tax")??""),2);}catch{return {message:"Ingresa un porcentaje de IVA explícito."};}
  const previous=await db.from("settings").select("value").eq("key","commercial").maybeSingle();
  const kept=commercialSchema.shape.tax_exemptions.safeParse((previous.data?.value as {tax_exemptions?:unknown}|undefined)?.tax_exemptions);
  const parsed=commercialSchema.safeParse({tax_exemptions:kept.success?kept.data:[],company:{name:form.get("companyName"),rut:form.get("rut"),address:form.get("address"),email:form.get("email"),phone:form.get("phone")},tax_bps:tax,validity_days:Number(form.get("validityDays")),payment_terms:form.get("paymentTerms"),warranty:form.get("warranty")});
  if(!parsed.success)return {message:"Completa los datos comerciales, IVA, validez y condiciones de pago. La garantía puede quedar vacía."};
  const {error}=await db.from("settings").upsert({key:"commercial",value:parsed.data});
  if(error)return {message:"No se guardó la configuración comercial."};
  revalidatePath("/admin/tarifario");revalidatePath("/admin/cotizaciones");
  return {message:"Configuración comercial guardada.",ok:true};
}

/** SUPERADMIN: tratamientos sin IVA con fundamento legal. Se exige revisión del contador antes de usarlos. */
export async function saveTaxExemptions(_:PriceState,form:FormData):Promise<PriceState>{
  const {db,profile}=await requireAdmin();
  if(profile.role!=="SUPERADMIN")return {message:"Solo SUPERADMIN puede configurar exenciones."};
  if(form.get("accountant")!=="on")return {message:"Confirma que el fundamento fue validado por el contador."};
  const current=await db.from("settings").select("value").eq("key","commercial").maybeSingle();
  const base=commercialSchema.safeParse(current.data?.value);
  if(!base.success)return {message:"Primero guarda las condiciones comerciales."};
  const rows=[0,1,2,3,4].map(i=>({key:String(form.get(`key_${i}`)??"").trim(),label:String(form.get(`label_${i}`)??"").trim(),kind:String(form.get(`kind_${i}`)??"exempt"),legal_basis:String(form.get(`basis_${i}`)??"").trim()})).filter(r=>r.key||r.label||r.legal_basis);
  const parsed=commercialSchema.shape.tax_exemptions.safeParse(rows);
  if(!parsed.success||new Set(parsed.data.map(r=>r.key)).size!==parsed.data.length)return {message:"Cada tratamiento necesita clave única (a-z, 0-9, _), nombre y fundamento legal (mín. 10 caracteres)."};
  const {error}=await db.from("settings").upsert({key:"commercial",value:{...base.data,tax_exemptions:parsed.data},updated_by:profile.id});
  if(error)return {message:"No se guardaron los tratamientos tributarios."};
  revalidatePath("/admin/tarifario");revalidatePath("/admin/cotizaciones");
  return {ok:true,message:"Tratamientos tributarios guardados. Las cotizaciones existentes conservan el tratamiento aplicado."};
}
