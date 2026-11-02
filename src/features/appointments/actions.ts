"use server";
import {requireAdmin} from "@/lib/auth";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {appointmentSchema,appointmentTimes} from "./schema";
export async function saveAppointment(_:string,form:FormData) {
  const {db,profile}=await requireAdmin();
  const parsed=appointmentSchema.safeParse(Object.fromEntries(form));
  if(!parsed.success) return "Revisa el cliente, dirección, comuna, fecha y servicio.";
  const {id,updated_at,...d}=parsed.data;
  let times:ReturnType<typeof appointmentTimes>;
  try {times=appointmentTimes(d.starts_at,d.ends_at);} catch {return "Revisa el horario de Santiago. El término debe ser posterior al inicio y la duración no debe superar 24 horas.";}
  const contact=await db.from("contacts").select("id").eq("id",d.contact_id).single();
  if(contact.error) return "El contacto no está disponible.";
  if(d.lead_id) {
    const lead=await db.from("leads").select("id").eq("id",d.lead_id).eq("contact_id",d.contact_id).single();
    if(lead.error) return "La oportunidad seleccionada no corresponde a este cliente.";
  }
  if(d.technician_id) {
    const technician=await db.from("profiles").select("id").eq("id",d.technician_id).eq("active",true).single();
    if(technician.error) return "El técnico seleccionado no está activo.";
  }
  let status=d.status;
  if(id) {
    const current=await db.from("appointments").select("starts_at,ends_at,status").eq("id",id).single();
    if(current.error) return "La cita ya no está disponible.";
    const changed=Date.parse(current.data.starts_at)!==Date.parse(times.starts_at) || Date.parse(current.data.ends_at)!==Date.parse(times.ends_at);
    if(changed && (status==="scheduled" || status==="rescheduled")) status="rescheduled";
  }
  const values={...d,...times,lead_id:d.lead_id || null,technician_id:d.technician_id || null,status,notes:d.notes || null,result:d.result || null};
  const result=id ? await db.from("appointments").update(values).eq("id",id).eq("updated_at",updated_at).select("id").single() : await db.from("appointments").insert({...values,created_by:profile.id}).select("id").single();
  if(result.error || !result.data) return "No se guardó la cita. Puede haber sido modificada por otra persona; recarga antes de volver a intentar.";
  revalidatePath("/admin","layout");
  redirect(`/admin/agenda/${result.data.id}`);
}
