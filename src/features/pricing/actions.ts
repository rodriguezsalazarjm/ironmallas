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
  const parsed=commercialSchema.safeParse({company:{name:form.get("companyName"),rut:form.get("rut"),address:form.get("address"),email:form.get("email"),phone:form.get("phone")},tax_bps:tax,validity_days:Number(form.get("validityDays")),payment_terms:form.get("paymentTerms"),warranty:form.get("warranty")});
  if(!parsed.success)return {message:"Completa los datos comerciales, IVA, validez y condiciones de pago. La garantía puede quedar vacía."};
  const {error}=await db.from("settings").upsert({key:"commercial",value:parsed.data});
  if(error)return {message:"No se guardó la configuración comercial."};
  revalidatePath("/admin/tarifario");revalidatePath("/admin/cotizaciones");
  return {message:"Configuración comercial guardada.",ok:true};
}
