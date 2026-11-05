"use server";
import {reviewSchema} from "./schema";
import {revalidatePath,updateTag} from "next/cache";
import {requireAdmin} from "@/lib/auth";
import type {ActionState} from "@/components/admin/action-form";
export async function saveReview(_:ActionState,form:FormData):Promise<ActionState>{
  const {db,profile}=await requireAdmin();
  const parsed=reviewSchema.safeParse(Object.fromEntries(form));
  if(!parsed.success)return {ok:false,message:"Revisa nombre, calificación y testimonio original."};
  const d=parsed.data;const consent=form.get("publication_consent")==="on";const image=form.get("image_consent")==="on";const published=form.get("published")==="on";
  const paths=d.photos.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(paths.some(p=>!/^content\/[a-f0-9-]+\.jpg$/.test(p))||paths.length>6)return {ok:false,message:"Usa hasta seis rutas de fotografías de la biblioteca autorizada, una por línea."};
  if(published&&(!consent||!d.presentation_text||paths.length>0&&!image))return {ok:false,message:"Para publicar se requiere autorización, texto de presentación y permiso de imágenes si hay fotografías."};
  if(/[<>]/.test(d.original_text+d.presentation_text+d.display_name))return {ok:false,message:"Usa texto sin HTML."};
  const value={contact_id:d.contact_id||null,display_name:d.display_name,rating:d.rating,original_text:d.original_text,presentation_text:d.presentation_text||d.original_text,photo_paths:paths,publication_consent:consent,image_consent:image,published,featured:form.get("featured")==="on"};
  const result=d.id?await db.from("reviews").update(value).eq("id",d.id).select("id").single():await db.from("reviews").insert({...value,created_by:profile.id}).select("id").single();
  if(result.error)return {ok:false,message:"No se guardó la reseña. Comprueba las autorizaciones."};
  updateTag("public-content");revalidatePath("/admin/resenas");revalidatePath("/");return {ok:true,message:published?"Reseña publicada con autorización registrada.":"Reseña guardada sin publicación pública."};
}
