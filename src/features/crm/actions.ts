"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { contactSchema,manualLeadSchema,taskSchema } from "./schema";
import { fromSantiagoInput } from "./time";

export async function saveContact(_: string, form: FormData) {
  const { db } = await requireAdmin();
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Revisa nombre, teléfono, correo y los campos indicados. La ubicación debe ser un enlace HTTPS.";
  const { id,updated_at,...input } = parsed.data;
  const [phoneMatches,emailMatches] = await Promise.all([
    db.from("contacts").select("id,email,phone").eq("phone",input.phone).limit(10),
    input.email ? db.from("contacts").select("id,email,phone").eq("email",input.email).limit(10) : Promise.resolve({ data: [] as {id:string;email:string|null;phone:string|null}[], error: null }),
  ]);
  if (phoneMatches.error || emailMatches.error) return "No se pudo comprobar si el contacto existe. Intenta nuevamente.";
  const matches = [...phoneMatches.data,...emailMatches.data].filter(c => c.id !== id);
  if (matches.some(c => c.email === input.email && c.phone === input.phone)) return "Ya existe un contacto con ese correo y teléfono. Búscalo en Clientes para conservar su historial.";
  if (matches.length && form.get("allow_duplicate") !== "on") return "Hay un posible duplicado por teléfono o correo. Revisa la búsqueda de Clientes; si son personas distintas, confirma la excepción al final del formulario.";
  const consent = form.get("consent") === "on";
  let consentAt: string | null = consent ? new Date().toISOString() : null;
  if (id) {
    const current = await db.from("contacts").select("consent,consent_at").eq("id",id).single();
    if (current.error) return "No se pudo cargar el contacto para editar.";
    if (consent && current.data.consent) consentAt = current.data.consent_at;
  }
  const values = { ...input,whatsapp:input.whatsapp?.replace(/\D/g,"") || null,is_client:form.get("is_client") === "on",consent,consent_at:consentAt };
  if(id && !updated_at) return "Recarga la ficha antes de guardar cambios.";
  const result = id ? await db.from("contacts").update(values).eq("id",id).eq("updated_at",updated_at!).select("id").single() : await db.from("contacts").insert(values).select("id").single();
  if (result.error || !result.data) return "No fue posible guardar el contacto. Puede haber un duplicado o cambios de otra persona; recarga la ficha y revisa antes de volver a intentar.";
  revalidatePath("/admin","layout");
  redirect(`/admin/clientes/${result.data.id}`);
}
export async function createManualLead(_: string, form: FormData) {
  const { db } = await requireAdmin();
  const parsed = manualLeadSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Revisa el contacto, servicio y responsable.";
  const input=parsed.data;
  const [contact,status] = await Promise.all([
    db.from("contacts").select("consent,consent_at").eq("id",input.contact_id).single(),
    db.from("lead_statuses").select("id").eq("key","new").eq("active",true).single(),
  ]);
  if (contact.error || status.error) return "No se pudo preparar la oportunidad.";
  if (!contact.data.consent || !contact.data.consent_at) return "Registra primero la autorización de uso de datos en la ficha del contacto.";
  if (input.assigned_to) {
    const responsible=await db.from("profiles").select("id").eq("id",input.assigned_to).eq("active",true).single();
    if (responsible.error) return "El responsable seleccionado no está activo.";
  }
  const result=await db.from("leads").insert({contact_id:input.contact_id,service:input.service,message:input.message || null,assigned_to:input.assigned_to || null,status_id:status.data.id,source:"manual",consent:true,consent_at:contact.data.consent_at,tracking:{}}).select("id").single();
  if (result.error || !result.data) return "No se pudo guardar la oportunidad.";
  revalidatePath("/admin","layout");
  redirect(`/admin/leads/${result.data.id}`);
}
export async function assignLead(_: string,form: FormData) {
  const { db }=await requireAdmin();
  const parsed=z.object({id:z.uuid(),assigned_to:z.union([z.uuid(),z.literal("")])}).safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Selecciona un responsable válido.";
  if (parsed.data.assigned_to) {
    const profile=await db.from("profiles").select("id").eq("id",parsed.data.assigned_to).eq("active",true).single();
    if (profile.error) return "El responsable no está activo.";
  }
  const result=await db.from("leads").update({assigned_to:parsed.data.assigned_to || null}).eq("id",parsed.data.id).select("id").single();
  if(result.error) return "No se pudo guardar la asignación.";
  revalidatePath("/admin","layout");
  return "Responsable actualizado.";
}
export async function createTask(_: string,form: FormData) {
  const { db,profile }=await requireAdmin();
  const parsed=taskSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Revisa título, fecha y responsable.";
  let due: string;
  try { due=fromSantiagoInput(parsed.data.due_at); } catch { return "La fecha u hora no es válida en Santiago. Revisa el horario."; }
  const d=parsed.data;
  if(d.lead_id) {
    const lead=await db.from("leads").select("id").eq("id",d.lead_id).eq("contact_id",d.contact_id).single();
    if(lead.error) return "La oportunidad no corresponde a este contacto.";
  }
  if(d.assigned_to) {
    const owner=await db.from("profiles").select("id").eq("id",d.assigned_to).eq("active",true).single();
    if(owner.error) return "El responsable seleccionado no está activo.";
  }
  const result=await db.from("tasks").insert({contact_id:d.contact_id,lead_id:d.lead_id || null,title:d.title,due_at:due,status:"pending",assigned_to:d.assigned_to || null,notes:d.notes || null,created_by:profile.id}).select("id").single();
  if(result.error) return "No se pudo guardar el seguimiento.";
  revalidatePath("/admin","layout");
  return "Seguimiento programado.";
}
export async function setTaskStatus(_: string,form: FormData) {
  const { db }=await requireAdmin();
  const parsed=z.object({id:z.uuid(),status:z.enum(["pending","completed","cancelled"])}).safeParse(Object.fromEntries(form));
  if(!parsed.success) return "Estado inválido.";
  const result=await db.from("tasks").update({status:parsed.data.status,completed_at:parsed.data.status === "completed" ? new Date().toISOString() : null}).eq("id",parsed.data.id).select("id").single();
  if(result.error) return "No se pudo actualizar el seguimiento.";
  revalidatePath("/admin","layout");
  return "Seguimiento actualizado.";
}
