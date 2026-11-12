import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database,Appointment} from "@/lib/supabase/database.types";
import {calApiClient,type CalClient} from "@/features/integrations/cal-api";
import {planAppointmentChange,scheduleErrorMessage,type AppointmentChange} from "./sync-plan";

type Db=SupabaseClient<Database>;
type Extra=Partial<Pick<Appointment,"technician_id"|"notes"|"result"|"address"|"commune"|"building"|"unit"|"floor"|"access_notes"|"zone_kind"|"kind"|"service"|"lead_id"|"contact_id">>;

/**
 * Single path for every admin change to an appointment (full form and calendar quick actions).
 * Linked installation appointments are historical and refused; Cal.com bookings are updated in Cal.com first.
 */
export async function applyAppointmentChange(db:Db,id:string,expectedUpdatedAt:string,requested:AppointmentChange,extra:Extra,reason:string,cal:CalClient|null=calApiClient()):Promise<{ok:true}|{ok:false;error:string}>{
  const linked=await db.from("installations").select("id").eq("appointment_id",id).limit(1);
  if(linked.error)return {ok:false,error:"No se pudo comprobar el vínculo con instalaciones."};
  if(linked.data.length)return {ok:false,error:"Esta cita está vinculada a un trabajo. Programa o cancela desde su ficha de instalación."};
  const current=await db.from("appointments").select("*").eq("id",id).single();
  if(current.error||!current.data)return {ok:false,error:"La cita ya no está disponible."};
  if(current.data.updated_at!==expectedUpdatedAt&&Date.parse(current.data.updated_at)!==Date.parse(expectedUpdatedAt))return {ok:false,error:"La cita fue modificada por otra persona o por Cal.com. Recarga antes de volver a intentar."};
  const plan=planAppointmentChange(current.data,requested,Boolean(cal));
  if(!plan.ok)return {ok:false,error:plan.error};
  const technician=extra.technician_id===undefined?current.data.technician_id:extra.technician_id;
  if(plan.cal!=="cancel"&&technician&&(plan.next.status==="scheduled"||plan.next.status==="rescheduled")){
    const conflict=await db.rpc("schedule_conflict",{p_technician:technician,p_starts:plan.next.starts_at,p_ends:plan.next.ends_at,p_appointment:id});
    if(conflict.error)return {ok:false,error:"No se pudo comprobar la disponibilidad del técnico."};
    if(conflict.data)return {ok:false,error:scheduleErrorMessage({code:"23P01"},"")};
  }
  let calUid=current.data.cal_booking_uid;
  if(plan.cal!=="none"&&cal&&calUid){
    const result=plan.cal==="cancel"?await cal.cancel(calUid,reason||"Cancelada por Iron Mallas"):await cal.reschedule(calUid,plan.next.starts_at,reason||"Reprogramada por Iron Mallas");
    if(!result.ok){
      // Registro visible del fallo; el horario y el estado internos se conservan.
      await db.from("appointments").update({cal_sync_status:"failed",cal_sync_error:result.error}).eq("id",id);
      return {ok:false,error:`${result.error} No se modificó la agenda interna; la reserva externa sigue como estaba.`};
    }
    calUid=result.uid;
  }
  const values={...extra,...plan.next,...(plan.cal!=="none"?{cal_booking_uid:calUid,cal_sync_status:"synced" as const,cal_sync_error:null,cal_synced_at:new Date().toISOString()}:{})};
  const saved=await db.from("appointments").update(values).eq("id",id).eq("updated_at",current.data.updated_at).select("id").single();
  if(saved.error||!saved.data){
    if(plan.cal!=="none"){
      await db.from("appointments").update({cal_sync_status:"pending",cal_sync_error:"Cal.com aceptó el cambio, pero la agenda interna no se guardó. Se aplicará al recibir el webhook; revisa la ficha.",...(calUid?{cal_booking_uid:calUid}:{})}).eq("id",id);
      return {ok:false,error:"Cal.com aceptó el cambio, pero la agenda interna no se pudo guardar. Quedó marcada como pendiente de sincronización."};
    }
    return {ok:false,error:scheduleErrorMessage(saved.error,"No se guardó la cita. Puede haber sido modificada por otra persona; recarga antes de volver a intentar.")};
  }
  return {ok:true};
}
