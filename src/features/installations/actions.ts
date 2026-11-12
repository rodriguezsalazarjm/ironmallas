"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { fromSantiagoInput } from "@/features/crm/time";
import type { ActionState } from "@/components/admin/action-form";
import {scheduleErrorMessage} from "@/features/appointments/sync-plan";
import {installationEditSchema,installationStatusSchema,installationScheduleSchema} from "./schema";
const answer = (ok: boolean, message: string): ActionState => ({ ok, message });
export async function saveTechnicalData(_:ActionState,form:FormData):Promise<ActionState>{
  const {db}=await requireAdmin();const edit=installationEditSchema.safeParse(Object.fromEntries(form));const raw=form.get("data");if(!edit.success||typeof raw!=="string"||raw.length>40000)return answer(false,"Ficha técnica inválida.");
  let value:unknown;try{value=JSON.parse(raw);}catch{return answer(false,"No se pudo interpretar la ficha.");}
  const parsed=z.array(z.object({label:z.string().trim().min(1).max(80),value:z.string().max(1000)})).max(30).safeParse(value);if(!parsed.success||new Set(parsed.data.map(f=>f.label)).size!==parsed.data.length)return answer(false,"Usa nombres de campo únicos y completa su nombre.");
  if(parsed.data.some(f=>/[<>]/.test(f.label+f.value)))return answer(false,"Usa texto sin HTML.");
  const {data,error}=await db.from("installations").update({technical_data:Object.fromEntries(parsed.data.map(f=>[f.label,f.value]))}).eq("id",edit.data.id).eq("updated_at",edit.data.updated_at).select("id").single();if(error||!data)return answer(false,"No se guardó la ficha. Puede haber cambios de otra persona; recarga y revisa antes de reintentar.");revalidatePath(`/admin/instalaciones/${edit.data.id}`);return answer(true,"Ficha técnica guardada e historial actualizado.");
}
export async function createInstallation(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const parsed = z.object({ quote: z.uuid(), address: z.string().trim().min(3).max(240), commune: z.string().trim().min(2).max(60), scheduled: z.string(), technician: z.union([z.uuid(), z.literal("")]), notes: z.string().max(4000), type: z.string().max(120), color: z.string().max(80), anchors: z.string().max(160), structure: z.string().max(160), dimensions: z.string().max(600), location: z.string().max(240), duration: z.union([z.coerce.number().int().min(15).max(1440), z.literal("")]).default(""), building: z.string().trim().max(120).default(""), unit: z.string().trim().max(40).default(""), floor: z.string().trim().max(20).default(""), access_notes: z.string().trim().max(1000).default("") }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return answer(false,"Revisa los datos del trabajo.");
  const d = parsed.data;
  try {
    const { data: jobId, error } = await db.rpc("create_installation", { p_quote_id: d.quote, p_address: d.address, p_commune: d.commune, p_scheduled_at: d.scheduled ? fromSantiagoInput(d.scheduled) : null, p_technician_id: d.technician || null, p_notes: d.notes || null, p_technical_data: { type: d.type, color: d.color, anchors: d.anchors, structure: d.structure, dimensions: d.dimensions, location: d.location } });
    if (error || !jobId) return answer(false,scheduleErrorMessage(error,"No se creó el trabajo. Comprueba que la cotización esté aceptada y no tenga ya una instalación."));
    const extra = await db.from("installations").update({ duration_minutes: d.duration === "" ? null : d.duration, building: d.building || null, unit: d.unit || null, floor: d.floor || null, access_notes: d.access_notes || null }).eq("id", jobId);
    revalidatePath("/admin", "layout");
    if (extra.error) return answer(false,`Instalación creada, pero no se guardó la duración ni los datos de acceso: ${scheduleErrorMessage(extra.error,"revisa la ficha")}.`);
    return answer(true,"Instalación creada y programada. Se avisará al cliente y al administrador si tiene fecha.");
  } catch { return answer(false,"Revisa la fecha y la conexión antes de volver a intentar."); }
}
export async function changeInstallation(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const parsed = installationStatusSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return answer(false,"Indica el estado y una nota de gestión.");
  const { error } = await db.rpc("set_installation_status_checked", { p_id: parsed.data.id, p_status: parsed.data.status, p_notes: parsed.data.notes, p_expected_updated_at: parsed.data.updated_at });
  if (error) return answer(false,"No se cambió el estado. Puede haber cambios de otra persona; recarga y revisa la secuencia del trabajo.");
  revalidatePath("/admin", "layout"); return answer(true,"Estado actualizado e historial conservado.");
}
export async function scheduleInstallation(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const parsed = installationScheduleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return answer(false,"Revisa la programación y dirección.");
  try {
    const { id, updated_at, scheduled, technician, duration, ...rest } = parsed.data;
    const { data, error } = await db.from("installations").update({ ...rest, scheduled_at:fromSantiagoInput(scheduled),technician_id:technician||null,duration_minutes:duration===""?null:duration }).eq("id",id).eq("updated_at",updated_at).select("id").single();
    if (error || !data) return answer(false,scheduleErrorMessage(error,"No se guardó la programación. Puede haber cambios de otra persona; recarga y revisa antes de reintentar."));
    revalidatePath("/admin","layout"); return answer(true,"Programación actualizada. El cambio queda registrado en auditoría.");
  } catch { return answer(false,"Fecha inválida para Santiago."); }
}
export async function registerPayment(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const parsed = z.object({ id:z.uuid(), amount:z.coerce.number().int().positive().max(2147483647),method:z.string().trim().min(2).max(80),reference:z.string().max(200),paid:z.string().min(1) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return answer(false,"Ingresa un importe CLP entero positivo, medio y fecha.");
  try {
    const { error } = await db.rpc("record_payment",{ p_installation_id:parsed.data.id,p_amount:parsed.data.amount,p_method:parsed.data.method,p_reference:parsed.data.reference||null,p_paid_at:fromSantiagoInput(parsed.data.paid) });
    if (error) return answer(false,"No se registró el pago. Revisa que no exceda el importe aprobado.");
    revalidatePath("/admin","layout"); return answer(true,"Pago registrado.");
  } catch { return answer(false,"Revisa la fecha del pago."); }
}
export async function saveWarranty(_: ActionState, form: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const parsed = z.object({ installation_id:z.uuid(),starts_on:z.iso.date(),duration_months:z.coerce.number().int().min(1).max(240),terms:z.string().trim().min(10).max(8000),status:z.enum(["active","expired","claimed","void"]),notes:z.string().max(4000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return answer(false,"Completa fecha, duración y condiciones reales de garantía.");
  const { error } = await db.from("warranties").upsert({ ...parsed.data,created_by:profile.id },{ onConflict:"installation_id" });
  if (error) return answer(false,"No se guardó la garantía.");
  revalidatePath("/admin","layout"); return answer(true,"Garantía guardada.");
}
