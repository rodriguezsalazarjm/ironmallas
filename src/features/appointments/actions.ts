"use server";
import {requireAdmin} from "@/lib/auth";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import type {ActionState} from "@/components/admin/action-form";
import {fromSantiagoInput} from "@/features/crm/time";
import {appointmentSchema,appointmentTimes,cancelSchema,quickScheduleSchema} from "./schema";
import {applyAppointmentChange} from "./change";
import {scheduleErrorMessage} from "./sync-plan";

const nul=(v:string)=>v||null;
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
  const extra={contact_id:d.contact_id,lead_id:nul(d.lead_id),kind:d.kind,service:d.service,address:d.address,commune:d.commune,building:nul(d.building),unit:nul(d.unit),floor:nul(d.floor),access_notes:nul(d.access_notes),zone_kind:d.zone_kind||null,technician_id:nul(d.technician_id),notes:nul(d.notes),result:nul(d.result)};
  let target=id;
  if(id) {
    const result=await applyAppointmentChange(db,id,updated_at,{...times,status:d.status},extra,"Actualizada desde el panel Iron Mallas");
    if(!result.ok) return result.error;
  } else {
    const inserted=await db.from("appointments").insert({...extra,...times,status:d.status,source:"admin",created_by:profile.id}).select("id").single();
    if(inserted.error || !inserted.data) return scheduleErrorMessage(inserted.error,"No se guardó la cita. Revisa los datos y vuelve a intentar.");
    target=inserted.data.id;
  }
  revalidatePath("/admin","layout");
  redirect(`/admin/agenda/${target}`);
}

/** Calendar quick action: move date/time, change duration (when known) or reassign technician. */
export async function quickSchedule(_:ActionState,form:FormData):Promise<ActionState>{
  const {db}=await requireAdmin();
  const parsed=quickScheduleSchema.safeParse(Object.fromEntries(form));
  if(!parsed.success)return {ok:false,message:"Revisa fecha, hora, duración y técnico."};
  const d=parsed.data;let start:string;
  try{start=fromSantiagoInput(`${d.date}T${d.time}`);}catch{return {ok:false,message:"La hora no existe en Santiago (cambio de horario). Elige otra."};}
  if(d.technician){const t=await db.from("profiles").select("id").eq("id",d.technician).eq("active",true).maybeSingle();if(!t.data)return {ok:false,message:"El técnico seleccionado no está activo."};}
  if(d.source==="appointment"){
    const current=await db.from("appointments").select("starts_at,ends_at,status").eq("id",d.id).single();
    if(current.error)return {ok:false,message:"La cita ya no está disponible."};
    const minutes=d.duration===""?Math.round((Date.parse(current.data.ends_at)-Date.parse(current.data.starts_at))/60000):d.duration;
    if(current.data.status==="cancelled"||current.data.status==="completed")return {ok:false,message:"Una cita cancelada o realizada no se reprograma; crea una nueva."};
    const status=current.data.status;
    const result=await applyAppointmentChange(db,d.id,d.updated_at,{starts_at:start,ends_at:new Date(Date.parse(start)+minutes*60000).toISOString(),status},{technician_id:d.technician||null},d.reason||"Reprogramada desde la agenda Iron Mallas");
    if(!result.ok)return {ok:false,message:result.error};
  } else {
    const job=await db.from("installations").select("status,updated_at").eq("id",d.id).single();
    if(job.error)return {ok:false,message:"Trabajo no disponible."};
    if(["completed","cancelled"].includes(job.data.status))return {ok:false,message:"Un trabajo cerrado no se reprograma."};
    const saved=await db.from("installations").update({scheduled_at:start,duration_minutes:d.duration===""?null:d.duration,technician_id:d.technician||null}).eq("id",d.id).eq("updated_at",d.updated_at).select("id").single();
    if(saved.error||!saved.data)return {ok:false,message:scheduleErrorMessage(saved.error,"No se guardó. Puede haber cambios de otra persona; recarga y revisa.")};
  }
  revalidatePath("/admin","layout");
  return {ok:true,message:"Horario actualizado. Los avisos de la fecha anterior quedaron invalidados."};
}

export async function cancelAgendaEntry(_:ActionState,form:FormData):Promise<ActionState>{
  const {db}=await requireAdmin();
  const parsed=cancelSchema.safeParse(Object.fromEntries(form));
  if(!parsed.success)return {ok:false,message:"Indica el motivo de la cancelación (mínimo 3 caracteres)."};
  const d=parsed.data;
  if(d.source==="appointment"){
    const current=await db.from("appointments").select("starts_at,ends_at,notes").eq("id",d.id).single();
    if(current.error)return {ok:false,message:"La cita ya no está disponible."};
    const notes=[current.data.notes,`Cancelación: ${d.reason}`].filter(Boolean).join("\n").slice(0,4000);
    const result=await applyAppointmentChange(db,d.id,d.updated_at,{starts_at:current.data.starts_at,ends_at:current.data.ends_at,status:"cancelled"},{notes},d.reason);
    if(!result.ok)return {ok:false,message:result.error};
  } else {
    const {error}=await db.rpc("set_installation_status_checked",{p_id:d.id,p_status:"cancelled",p_notes:`Cancelación: ${d.reason}`,p_expected_updated_at:d.updated_at});
    if(error)return {ok:false,message:"No se canceló. Puede haber cambios de otra persona o el trabajo ya está cerrado."};
  }
  revalidatePath("/admin","layout");
  return {ok:true,message:"Evento cancelado. No se enviarán recordatorios; se avisará al cliente y al administrador."};
}
