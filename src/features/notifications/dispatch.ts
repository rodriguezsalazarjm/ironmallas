import "server-only";
import {Resend} from "resend";
import {z} from "zod";
import {createServiceClient} from "@/lib/supabase/service";
import {siteUrl} from "@/lib/site-url";
import {dispatchAgendaNotices} from "./agenda";
import {claimNotification,releaseFailure} from "./queue";
import {MAX_ATTEMPTS,providerVerdict} from "./queue-rules";
export async function dispatchNotifications(){
  const key=process.env.RESEND_API_KEY;const from=process.env.RESEND_FROM_EMAIL;
  if(!key||!from)return {configured:false,sent:0,failed:0};
  const db=createServiceClient();const settings=await db.from("settings").select("value").eq("key","notifications").maybeSingle();
  const config=settings.data?.value as {enabled?:boolean;recipient?:string;lead_alerts?:boolean;follow_up_alerts?:boolean;agenda_alerts?:boolean}|undefined;
  const recipient=config?.recipient||process.env.LEADS_NOTIFY_EMAIL;
  if(!config?.enabled||!z.email().safeParse(recipient).success)return {configured:false,sent:0,failed:0};
  if(config.follow_up_alerts){
    const due=await db.from("tasks").select("id,title,due_at").eq("status","pending").lte("due_at",new Date().toISOString()).limit(100);
    if(due.error)throw new Error("No se pudieron preparar recordatorios.");
    for(const task of due.data){
      const dedupe=`task:${task.id}:${task.due_at}`;
      const existing=await db.from("notifications").select("id").eq("kind","task_due").contains("payload",{dedupe_key:dedupe}).limit(1);
      if(existing.error)throw new Error("No se pudieron revisar recordatorios.");
      if(!existing.data.length)await db.from("notifications").insert({kind:"task_due",recipient,subject:"Seguimiento pendiente · Iron Mallas",body:`Tarea pendiente: ${task.title}\nRevisa el panel administrativo.`,payload:{dedupe_key:dedupe,task_id:task.id}});
    }
  }
  const now=Date.now();
  const pending=await db.from("notifications").select("*").in("status",["pending","failed"]).in("kind",["lead_created","task_due"]).lt("attempts",MAX_ATTEMPTS).lte("send_after",new Date(now).toISOString()).order("send_after").limit(20);
  if(pending.error)throw new Error("No se pudieron cargar las notificaciones.");
  const resend=new Resend(key);let sent=0;let failed=0;
  for(const message of pending.data){
    if(message.kind==="lead_created"&&!config.lead_alerts)continue;
    if(message.kind==="task_due"&&!config.follow_up_alerts)continue;
    // Claim + lease: concurrent runs skip it; retries beyond the provider's idempotency window go to manual review.
    if(!await claimNotification(db,message,now))continue;
    const attempt=message.attempts+1;
    const {error}=await resend.emails.send({from,to:recipient!,subject:message.subject,text:message.body},{idempotencyKey:`notification-${message.id}`}).catch(()=>({error:{name:"network_error"}}));
    const verdict=providerVerdict(error);
    if(verdict!=="ok"){failed++;await releaseFailure(db,message.id,attempt,"El proveedor rechazó o no respondió; revisa remitente, dominio verificado y conectividad.",verdict==="review");continue;}
    const stored=await db.from("notifications").update({status:"sent",sent_at:new Date().toISOString(),last_error:null}).eq("id",message.id);
    // Accepted by the provider: never mark as failed (a retry would hit the idempotency key). Leave it leased and flagged.
    if(stored.error){failed++;await db.from("notifications").update({attempts:MAX_ATTEMPTS,last_error:"Proveedor aceptó; no se pudo confirmar el estado local. Revisar antes de reintentar."}).eq("id",message.id);continue;}
    sent++;
  }
  if(config.agenda_alerts){
    const agenda=await db.from("settings").select("value").eq("key","agenda").maybeSingle();
    // Por defecto Cal.com envía su propia confirmación de reserva al cliente: no se duplica.
    const calSends=(agenda.data?.value as {client_emails_for_cal?:boolean}|undefined)?.client_emails_for_cal!==true;
    const result=await dispatchAgendaNotices(db,resend,from,recipient!,{origin:(process.env.AUTH_SITE_URL||siteUrl.origin).replace(/\/$/,""),calSendsClientConfirmation:calSends});
    sent+=result.sent;failed+=result.failed;
  }
  return {configured:true,sent,failed};
}
