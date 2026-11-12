"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/components/admin/action-form";
import { photo } from "./process";
export async function uploadInstallationPhoto(_:ActionState,form:FormData):Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const parsed = z.object({ installation:z.uuid(),stage:z.enum(["before","during","after","detail","incident"]),caption:z.string().max(500) }).safeParse(Object.fromEntries(form));
  const file=form.get("file");
  if (!parsed.success || !(file instanceof File)) return {ok:false,message:"Selecciona una fotografía y su etapa."};
  const installation=await db.from("installations").select("id").eq("id",parsed.data.installation).single();
  if (installation.error) return {ok:false,message:"Trabajo no disponible."};
  try {
    const bytes=await photo(file);
    const path=`installations/${parsed.data.installation}/${randomUUID()}.jpg`;
    const upload=await db.storage.from("admin-documents").upload(path,bytes,{contentType:"image/jpeg",upsert:false});
    if (upload.error) return {ok:false,message:"No se pudo subir la fotografía."};
    const saved=await db.from("installation_photos").insert({ installation_id:parsed.data.installation,path,stage:parsed.data.stage,caption:parsed.data.caption||null,created_by:profile.id });
    if (saved.error) { await db.storage.from("admin-documents").remove([path]);return {ok:false,message:"No se pudo registrar la fotografía."}; }
    revalidatePath(`/admin/instalaciones/${parsed.data.installation}`);
    return {ok:true,message:"Fotografía privada guardada; no se publica en la web."};
  } catch (error) { return {ok:false,message:error instanceof Error ? error.message : "No se pudo procesar la imagen."}; }
}
