"use server";
import {z} from "zod";
import {privacyRequestSchema} from "./schema";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth";
import type {ActionState} from "@/components/admin/action-form";
export async function saveRetention(_:ActionState,form:FormData):Promise<ActionState>{
  const {db,profile}=await requireAdmin();if(profile.role!=="SUPERADMIN")return {ok:false,message:"Permiso insuficiente."};
  const parsed=z.object({days:z.coerce.number().int().min(1).max(36500),reason:z.string().trim().min(10).max(2000)}).safeParse(Object.fromEntries(form));if(!parsed.success)return {ok:false,message:"Indica plazo y criterio de retención aprobado."};
  const {error}=await db.from("settings").upsert({key:"privacy",value:{retention_days:parsed.data.days,retention_reason:parsed.data.reason},updated_by:profile.id});if(error)return {ok:false,message:"No se guardó la retención."};revalidatePath("/admin/privacidad");return {ok:true,message:"Retención configurada. Las solicitudes se revisan manualmente; no se eliminan registros automáticamente."};
}
export async function createPrivacyRequest(_:ActionState,form:FormData):Promise<ActionState>{
  const {db,profile}=await requireAdmin();const parsed=privacyRequestSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return {ok:false,message:"Selecciona cliente, tipo y motivo de la solicitud."};
  const {error}=await db.from("privacy_requests").insert({...parsed.data,created_by:profile.id});if(error)return {ok:false,message:"No se registró la solicitud."};revalidatePath("/admin/privacidad");return {ok:true,message:"Solicitud registrada para revisión controlada."};
}
export async function reviewPrivacyRequest(_:ActionState,form:FormData):Promise<ActionState>{
  const {db,profile}=await requireAdmin();if(profile.role!=="SUPERADMIN")return {ok:false,message:"Solo SUPERADMIN puede resolver solicitudes."};
  const parsed=z.object({id:z.uuid(),status:z.enum(["pending","reviewed","completed","rejected"]),resolution:z.string().trim().min(5).max(4000)}).safeParse(Object.fromEntries(form));if(!parsed.success)return {ok:false,message:"Indica el estado y la justificación de la resolución."};
  const {id,...value}=parsed.data;const {error}=await db.from("privacy_requests").update(value).eq("id",id);if(error)return {ok:false,message:"No se guardó la revisión."};revalidatePath("/admin/privacidad");return {ok:true,message:"Resolución registrada. Este control no elimina datos automáticamente."};
}
