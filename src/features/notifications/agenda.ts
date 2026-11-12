import "server-only";
import {createHash,randomBytes} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Resend} from "resend";
import type {Database} from "@/lib/supabase/database.types";
import {company} from "@/content/company";
import {renderAgendaEmail,type AgendaKind} from "./agenda-templates";
import {agendaNoticeVerdict} from "./agenda-rules";
import {claimNotification,releaseFailure} from "./queue";
import {MAX_ATTEMPTS,providerVerdict} from "./queue-rules";

export const AGENDA_KINDS:AgendaKind[]=["agenda_scheduled","agenda_rescheduled","agenda_cancelled","agenda_reminder"];
type Db=SupabaseClient<Database>;
type Event={startsAt:string|null;status:string;durationMinutes:number|null;address:string;commune:string;access:string|null;technicianId:string|null;contactId:string;service:string;source:string};

async function loadEvent(db:Db,entity:"appointment"|"installation",id:string):Promise<Event|null>{
  if(entity==="appointment"){
    const a=await db.from("appointments").select("starts_at,ends_at,status,address,commune,access_notes,technician_id,contact_id,service,source").eq("id",id).maybeSingle();
    if(a.error)throw new Error("No se pudo cargar la cita.");
    return a.data?{startsAt:a.data.starts_at,status:a.data.status,durationMinutes:Math.round((Date.parse(a.data.ends_at)-Date.parse(a.data.starts_at))/60000),address:a.data.address,commune:a.data.commune,access:a.data.access_notes,technicianId:a.data.technician_id,contactId:a.data.contact_id,service:a.data.service,source:a.data.source}:null;
  }
  const j=await db.from("installations").select("scheduled_at,duration_minutes,status,address,commune,access_notes,technician_id,contact_id,service").eq("id",id).maybeSingle();
  if(j.error)throw new Error("No se pudo cargar la instalación.");
  return j.data?{startsAt:j.data.scheduled_at,status:j.data.status,durationMinutes:j.data.duration_minutes,address:j.data.address,commune:j.data.commune,access:j.data.access_notes,technicianId:j.data.technician_id,contactId:j.data.contact_id,service:j.data.service,source:"installation"}:null;
}

/** Temporary confirmation link. Only the SHA-256 hash is stored; the link expires when the event starts. */
async function confirmationUrl(db:Db,origin:string,entity:"appointment"|"installation",id:string,startsAt:string){
  const token=randomBytes(32).toString("base64url");
  const {error}=await db.rpc("issue_attendance_token",{p_token_hash:createHash("sha256").update(token).digest("hex"),p_entity:entity,p_entity_id:id,p_starts:startsAt,p_expires:startsAt});
  if(error)throw new Error("No se pudo generar el enlace de confirmación.");
  return `${origin}/confirmar/${token}`;
}

export async function dispatchAgendaNotices(db:Db,resend:Resend,from:string,adminRecipient:string,options:{origin:string;calSendsClientConfirmation:boolean;now?:number}){
  const now=options.now??Date.now();let sent=0,failed=0,skipped=0;
  const pending=await db.from("notifications").select("*").in("kind",AGENDA_KINDS).in("status",["pending","failed"]).lte("send_after",new Date(now).toISOString()).lt("attempts",MAX_ATTEMPTS).order("send_after").limit(30);
  if(pending.error)throw new Error("No se pudieron cargar los avisos de agenda.");
  for(const n of pending.data){
    const audience=(n.payload as {audience?:string})?.audience==="admin"?"admin":"client";
    if(!n.entity||!n.entity_id){skipped++;continue;}
    const event=await loadEvent(db,n.entity,n.entity_id);
    const contact=event?await db.from("contacts").select("name,email,phone,whatsapp").eq("id",event.contactId).maybeSingle():null;
    // Re-validated at send time: a cancelled, completed or moved event never gets the old notice.
    const verdict=agendaNoticeVerdict(n,event,now,{clientEmail:contact?.data?.email??null,audience,calSendsClientConfirmation:options.calSendsClientConfirmation});
    if(!verdict.send){await db.from("notifications").update({status:"cancelled",last_error:verdict.reason}).eq("id",n.id).eq("attempts",n.attempts).in("status",["pending","failed"]);skipped++;continue;}
    // Claim + lease (send_after): a concurrent run cannot take it until this one resolves it.
    if(!await claimNotification(db,n,now))continue;
    const attempt=n.attempts+1;
    try{
      const technician=event!.technicianId?(await db.from("profiles").select("full_name").eq("id",event!.technicianId).maybeSingle()).data?.full_name:null;
      const startsAt=n.kind==="agenda_cancelled"?(n.event_starts_at??event!.startsAt!):event!.startsAt!;
      const near=(n.payload as {near?:boolean})?.near===true;
      const wantsConfirm=audience==="client"&&(n.kind==="agenda_reminder"||(near&&n.kind!=="agenda_cancelled"));
      const confirmUrl=wantsConfirm?await confirmationUrl(db,options.origin,n.entity,n.entity_id,startsAt):null;
      const email=renderAgendaEmail({kind:n.kind as AgendaKind,audience,entity:n.entity,clientName:contact?.data?.name??"Cliente",startsAt,durationMinutes:event!.durationMinutes,address:event!.address,commune:event!.commune,access:event!.access,technician,service:event!.service,phone:contact?.data?.phone??contact?.data?.whatsapp??null,
        company:{name:company.brand,phone:company.phoneDisplay,email:company.email},confirmUrl,near,adminUrl:`${options.origin}/admin/${n.entity==="appointment"?"agenda":"instalaciones"}/${n.entity_id}`});
      const to=audience==="admin"?adminRecipient:contact!.data!.email!;
      const {error}=await resend.emails.send({from,to,subject:email.subject,text:email.text,replyTo:company.email},{idempotencyKey:`notification-${n.id}`}).catch(()=>({error:{name:"network_error"}}));
      const result=providerVerdict(error);
      if(result!=="ok"){failed++;await releaseFailure(db,n.id,attempt,"El proveedor rechazó o no respondió; revisa remitente, dominio verificado y destinatario.",result==="review");continue;}
      const stored=await db.from("notifications").update({status:"sent",sent_at:new Date().toISOString(),last_error:null,recipient:to,subject:email.subject}).eq("id",n.id);
      // Accepted by the provider: do not mark failed (a retry would collide with the idempotency key).
      if(stored.error){failed++;await db.from("notifications").update({attempts:MAX_ATTEMPTS,last_error:"Proveedor aceptó; no se pudo confirmar el estado local. Revisar antes de reintentar."}).eq("id",n.id);continue;}
      sent++;
    }catch(error){failed++;await releaseFailure(db,n.id,attempt,error instanceof Error?error.message:"No se pudo enviar");}
  }
  return {sent,failed,skipped};
}
