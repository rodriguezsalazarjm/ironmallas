"use server";
import { z } from "zod";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { pdfFromSnapshot } from "./pdf-server";
import { quoteSnapshotSchema } from "./snapshot";
import { chileToday } from "./date";
import type { QuoteState } from "./actions";
export async function sendQuoteEmail(_:QuoteState,form:FormData):Promise<QuoteState>{
  const {db}=await requireAdmin();
  const parsed=z.object({id:z.uuid(),version:z.coerce.number().int().positive()}).safeParse(Object.fromEntries(form));
  if(!parsed.success)return {message:"La cotización no es válida."};
  const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
  if(!key||!from)return {message:"Correo no configurado. Configura Resend y verifica el dominio remitente; puedes descargar el PDF mientras tanto."};
  const {id,version}=parsed.data;
  const [quote,snapshot,previous]=await Promise.all([
    db.from("quotes").select("status,current_version,valid_until").eq("id",id).single(),
    db.from("quote_versions").select("snapshot").eq("quote_id",id).eq("version",version).single(),
    db.from("notifications").select("id").eq("kind","quote_email").eq("status","sent").contains("payload",{quote_id:id,version}).limit(1),
  ]);
  if(quote.error||snapshot.error||previous.error)return {message:"No se pudo preparar el envío."};
  if(previous.data.length)return {message:"Esta versión ya fue aceptada por el proveedor de correo. Consulta el registro antes de intentar reenviarla."};
  if(quote.data.current_version!==version||!["draft","sent"].includes(quote.data.status)||quote.data.valid_until<chileToday())return {message:"Solo se puede enviar la versión vigente y no vencida de una cotización en borrador o enviada."};
  const validated=quoteSnapshotSchema.safeParse(snapshot.data.snapshot);
  if(!validated.success||!z.email().safeParse(validated.data.contact.email).success)return {message:"Completa el correo del cliente y revisa el presupuesto antes de enviar."};
  const data=validated.data;
  const subject=`Cotización Iron Mallas IM-${String(data.quote.number).padStart(6,"0")} · versión ${version}`;
  const body=`Hola ${data.contact.name},\n\nAdjuntamos tu cotización de Iron Mallas. Puedes responder a este correo para consultar sus condiciones.\n\nVálida hasta: ${data.quote.valid_until}\n\n${data.company.name}\n${data.company.phone??""}`;
  const queued=await db.from("notifications").insert({kind:"quote_email",recipient:data.contact.email,subject,body,payload:{quote_id:id,version},status:"pending"}).select("id").single();
  if(queued.error)return {message:"No se pudo registrar el envío. No se envió el correo."};
  try{
    const pdf=await pdfFromSnapshot(snapshot.data.snapshot);
    const result=await new Resend(key).emails.send({from,to:data.contact.email??"",replyTo:data.company.email,subject,text:body,attachments:[{filename:pdf.filename,content:Buffer.from(pdf.bytes)}]},{idempotencyKey:`quote-${id}-v${version}`});
    if(result.error||!result.data){await db.from("notifications").update({status:"failed",attempts:1,last_error:"El proveedor rechazó o no confirmó el envío."}).eq("id",queued.data.id);return {message:"Resend no confirmó el envío. Revisa credenciales, dominio verificado y destinatario; el presupuesto sigue guardado."};}
    const log=await db.from("notifications").update({status:"sent",attempts:1,sent_at:new Date().toISOString(),payload:{quote_id:id,version,provider_id:result.data.id}}).eq("id",queued.data.id);
    const status=quote.data.status==="draft"?await db.rpc("set_quote_status",{p_quote_id:id,p_status:"sent",p_expected_version:version}):{error:null};
    revalidatePath(`/admin/cotizaciones/${id}`);revalidatePath("/admin/cotizaciones");
    if(log.error||status.error)return {message:"Resend aceptó el correo, pero no se actualizó todo el registro. Revisa la ficha antes de reenviar.",ok:true};
    return {message:"Resend aceptó el correo con el PDF adjunto. La entrega final depende del proveedor y del destinatario.",ok:true};
  }catch{await db.from("notifications").update({status:"failed",attempts:1,last_error:"No fue posible confirmar el envío."}).eq("id",queued.data.id);return {message:"No se pudo confirmar el envío. Consulta el registro de Resend antes de reintentar para evitar duplicados."};}
}
