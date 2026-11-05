import "server-only";
import {Resend} from "resend";
import {z} from "zod";
import {createServiceClient} from "@/lib/supabase/service";
export async function dispatchNotifications(){
  const key=process.env.RESEND_API_KEY;const from=process.env.RESEND_FROM_EMAIL;
  if(!key||!from)return {configured:false,sent:0,failed:0};
  const db=createServiceClient();const settings=await db.from("settings").select("value").eq("key","notifications").maybeSingle();
  const config=settings.data?.value as {enabled?:boolean;recipient?:string;lead_alerts?:boolean;follow_up_alerts?:boolean}|undefined;
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
  const pending=await db.from("notifications").select("*").in("status",["pending","failed"]).in("kind",["lead_created","task_due"]).lt("attempts",3).order("created_at").limit(20);
  if(pending.error)throw new Error("No se pudieron cargar las notificaciones.");
  const resend=new Resend(key);let sent=0;let failed=0;
  for(const message of pending.data){
    if(message.kind==="lead_created"&&!config.lead_alerts)continue;
    if(message.kind==="task_due"&&!config.follow_up_alerts)continue;
    // Do not retry beyond the provider's 24h idempotency window without manual review.
    if(message.attempts>0&&Date.now()-Date.parse(message.created_at)>23*3600000)continue;
    const claimed=await db.from("notifications").update({attempts:message.attempts+1}).eq("id",message.id).eq("attempts",message.attempts).select("id").maybeSingle();
    if(claimed.error||!claimed.data)continue;
    try{
      const {error}=await resend.emails.send({from,to:recipient!,subject:message.subject,text:message.body},{idempotencyKey:`notification-${message.id}`});
      if(error)throw new Error("El proveedor rechazó el correo; revisa remitente y dominio verificado.");
      const stored=await db.from("notifications").update({status:"sent",sent_at:new Date().toISOString(),last_error:null}).eq("id",message.id);
      if(stored.error)throw new Error("Proveedor aceptó; no se pudo confirmar el estado local. Revisar antes de reintentar.");
      sent++;
    }catch(error){failed++;await db.from("notifications").update({status:"failed",last_error:error instanceof Error?error.message:"No se pudo enviar"}).eq("id",message.id);}
  }
  return {configured:true,sent,failed};
}
