"use server";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth";
import {dispatchNotifications} from "./dispatch";
import type {ActionState} from "@/components/admin/action-form";
export async function saveNotificationSettings(_:ActionState,form:FormData):Promise<ActionState>{
  const {db,profile}=await requireAdmin();if(profile.role!=="SUPERADMIN")return {ok:false,message:"Solo SUPERADMIN puede cambiar preferencias."};
  const recipient=z.email().max(120).safeParse(form.get("recipient"));if(!recipient.success)return {ok:false,message:"Indica un correo interno válido."};
  const {error}=await db.from("settings").upsert({key:"notifications",value:{recipient:recipient.data,enabled:form.get("enabled")==="on",lead_alerts:form.get("lead_alerts")==="on",follow_up_alerts:form.get("follow_up_alerts")==="on",agenda_alerts:form.get("agenda_alerts")==="on"},updated_by:profile.id});
  if(error)return {ok:false,message:"No se guardaron las preferencias."};revalidatePath("/admin/notificaciones");return {ok:true,message:"Preferencias guardadas. El correo requiere Resend y un dominio verificado."};
}
export async function processNotifications(_:ActionState):Promise<ActionState>{
  void _;const {profile}=await requireAdmin();if(profile.role!=="SUPERADMIN")return {ok:false,message:"Permiso insuficiente."};
  try{const result=await dispatchNotifications();revalidatePath("/admin/notificaciones");return {ok:result.configured,message:result.configured?`${result.sent} avisos aceptados por el proveedor; ${result.failed} fallidos.`:"Configura Resend, remitente y preferencias antes de enviar avisos."};}catch{return {ok:false,message:"No se pudieron procesar los avisos. Las solicitudes permanecen guardadas."};}
}
