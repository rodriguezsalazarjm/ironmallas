import {timingSafeEqual} from "node:crypto";
import {z} from "zod";
import {createServiceClient} from "@/lib/supabase/service";
import {buildBusyCalendar,type BusyBlock} from "@/features/agenda/ics";

/** Private ICS feed of internal busy time for Cal.com conflict checking. URL secret: AGENDA_ICS_TOKEN (>=32 chars). */
export async function GET(request:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;const secret=process.env.AGENDA_ICS_TOKEN??"";
  if(secret.length<32)return new Response("No configurado",{status:503});
  if(Buffer.byteLength(token)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(token),Buffer.from(secret)))return new Response("No encontrado",{status:404});
  const technician=z.uuid().safeParse(new URL(request.url).searchParams.get("technician"));
  try{
    const db=createServiceClient();
    const from=new Date(Date.now()-86400000).toISOString(),to=new Date(Date.now()+180*86400000).toISOString();
    let visits=db.from("appointments").select("id,starts_at,ends_at,technician_id").in("status",["scheduled","rescheduled"]).neq("source","cal_booking").gte("starts_at",from).lt("starts_at",to).limit(3000);
    let jobs=db.from("installations").select("id,scheduled_at,duration_minutes,technician_id,appointment_id").in("status",["scheduled","rescheduled","in_progress"]).gte("scheduled_at",from).lt("scheduled_at",to).limit(3000);
    if(technician.success){visits=visits.eq("technician_id",technician.data);jobs=jobs.eq("technician_id",technician.data);}
    const [a,j,s]=await Promise.all([visits,jobs,db.from("settings").select("value").eq("key","agenda").maybeSingle()]);
    if(a.error||j.error)return new Response("No disponible",{status:503});
    const linked=new Set(j.data.flatMap(x=>x.appointment_id?[x.appointment_id]:[]));
    const cfg=(s.data?.value??{}) as {buffer_minutes?:number;default_installation_minutes?:number};
    const buffer=Number.isInteger(cfg.buffer_minutes)?Math.min(240,Math.max(0,cfg.buffer_minutes!)):0;
    const fallback=Number.isInteger(cfg.default_installation_minutes)?cfg.default_installation_minutes!:null;
    const blocks:BusyBlock[]=[
      ...a.data.filter(x=>!linked.has(x.id)).map(x=>({uid:`a-${x.id}`,starts_at:x.starts_at,ends_at:x.ends_at})),
      ...j.data.map(x=>{const minutes=x.duration_minutes??fallback;return {uid:`i-${x.id}`,starts_at:x.scheduled_at!,ends_at:minutes?new Date(Date.parse(x.scheduled_at!)+minutes*60000).toISOString():null};}),
    ];
    return new Response(buildBusyCalendar(blocks,buffer),{headers:{"Content-Type":"text/calendar; charset=utf-8","Cache-Control":"private, no-store","X-Robots-Tag":"noindex"}});
  }catch{return new Response("No disponible",{status:503});}
}
