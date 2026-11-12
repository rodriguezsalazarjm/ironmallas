"use server";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth";
import type {ActionState} from "@/components/admin/action-form";
import {photo} from "@/features/media/process";
import {assessmentSchema} from "./schema";

const path=(target:"appointment"|"installation",id:string)=>target==="appointment"?`/admin/agenda/${id}`:`/admin/instalaciones/${id}`;
const nul=(v:string)=>v||null;

export async function saveAssessment(_:ActionState,form:FormData):Promise<ActionState>{
  const {db,profile}=await requireAdmin();
  let zones:unknown;try{zones=JSON.parse(String(form.get("zones")??"[]"));}catch{return {ok:false,message:"No se pudieron leer las zonas."};}
  const parsed=assessmentSchema.safeParse({...Object.fromEntries(form),zones});
  if(!parsed.success)return {ok:false,message:"Revisa las medidas (en metros, mayores que cero) y los textos de la ficha."};
  const {target,target_id,id,updated_at,...d}=parsed.data;
  const values={zones:d.zones,mesh_type:nul(d.mesh_type),pillars_200:d.pillars_200,pillars_240:d.pillars_240,anchoring:nul(d.anchoring),wall_condition:nul(d.wall_condition),access_difficulties:nul(d.access_difficulties),additional_materials:nul(d.additional_materials),observations:nul(d.observations),recommendations:nul(d.recommendations)};
  const owner=target==="appointment"?await db.from("appointments").select("id").eq("id",target_id).maybeSingle():await db.from("installations").select("id").eq("id",target_id).maybeSingle();
  if(!owner.data)return {ok:false,message:"El evento ya no está disponible."};
  const result=id
    ?await db.from("technical_assessments").update({...values,updated_by:profile.id}).eq("id",id).eq("updated_at",updated_at).select("id").single()
    :await db.from("technical_assessments").insert({...values,[target==="appointment"?"appointment_id":"installation_id"]:target_id,created_by:profile.id,updated_by:profile.id}).select("id").single();
  if(result.error||!result.data)return {ok:false,message:id?"No se guardó: otra persona modificó la ficha. Recarga y revisa antes de reintentar.":"No se creó la ficha. Puede que ya exista una; recarga la página."};
  revalidatePath(path(target,target_id));
  return {ok:true,message:"Ficha técnica guardada. El historial conserva la versión anterior."};
}

export async function uploadAssessmentPhoto(_:ActionState,form:FormData):Promise<ActionState>{
  const {db,profile}=await requireAdmin();
  const parsed=z.object({assessment:z.uuid(),target:z.enum(["appointment","installation"]),target_id:z.uuid(),stage:z.enum(["before","after","detail","incident"]),caption:z.string().max(500)}).safeParse(Object.fromEntries(form));
  const file=form.get("file");
  if(!parsed.success||!(file instanceof File))return {ok:false,message:"Guarda la ficha y selecciona una fotografía y su etapa."};
  const owner=await db.from("technical_assessments").select("id").eq("id",parsed.data.assessment).maybeSingle();
  if(!owner.data)return {ok:false,message:"Guarda primero la ficha técnica."};
  try{
    const bytes=await photo(file);
    const key=`assessments/${parsed.data.assessment}/${randomUUID()}.jpg`;
    const upload=await db.storage.from("admin-documents").upload(key,bytes,{contentType:"image/jpeg",upsert:false});
    if(upload.error)return {ok:false,message:"No se pudo subir la fotografía."};
    const saved=await db.from("assessment_photos").insert({assessment_id:parsed.data.assessment,path:key,stage:parsed.data.stage,caption:parsed.data.caption||null,created_by:profile.id});
    if(saved.error){await db.storage.from("admin-documents").remove([key]);return {ok:false,message:"No se pudo registrar la fotografía."};}
    revalidatePath(path(parsed.data.target,parsed.data.target_id));
    return {ok:true,message:"Fotografía privada guardada (bucket privado, enlaces firmados de 5 minutos)."};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"No se pudo procesar la imagen."};}
}
