import {z} from "zod";
import {requireAdmin} from "@/lib/auth";
async function collect<T>(load:(start:number,end:number)=>PromiseLike<{data:T[]|null;error:unknown}>){
  const rows:T[]=[];
  for(let offset=0;;offset+=500){const page=await load(offset,offset+499);if(page.error || !page.data)throw new Error("Exportación incompleta");rows.push(...page.data);if(page.data.length<500)return rows;}
}
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}) {
  const {db}=await requireAdmin();const {id}=await params;
  const headers={"Cache-Control":"private, no-store","Content-Disposition":`attachment; filename="contacto-${id}.json"`,"X-Content-Type-Options":"nosniff"};
  if(!z.uuid().safeParse(id).success)return new Response("No encontrado",{status:404,headers:{"Cache-Control":"private, no-store"}});
  const contact=await db.from("contacts").select("*").eq("id",id).maybeSingle();
  if(contact.error)return new Response("No se pudo exportar",{status:503,headers:{"Cache-Control":"private, no-store"}});
  if(!contact.data)return new Response("No encontrado",{status:404,headers:{"Cache-Control":"private, no-store"}});
  try {
    const [leads,tasks,appointments,quotes,installations,reviews]=await Promise.all([
      collect((a,b)=>db.from("leads").select("*").eq("contact_id",id).order("id").range(a,b)),
      collect((a,b)=>db.from("tasks").select("*").eq("contact_id",id).order("id").range(a,b)),
      collect((a,b)=>db.from("appointments").select("*").eq("contact_id",id).order("id").range(a,b)),
      collect((a,b)=>db.from("quotes").select("*").eq("contact_id",id).order("id").range(a,b)),
      collect((a,b)=>db.from("installations").select("*").eq("contact_id",id).order("id").range(a,b)),
      collect((a,b)=>db.from("reviews").select("*").eq("contact_id",id).order("id").range(a,b)),
    ]);
    const activities=[];for(let offset=0;offset<leads.length;offset+=100) activities.push(...await collect((a,b)=>db.from("lead_activities").select("*").in("lead_id",leads.slice(offset,offset+100).map(l=>l.id)).order("id").range(a,b)));
    const quote_items=[],quote_versions=[];for(let offset=0;offset<quotes.length;offset+=100){const ids=quotes.slice(offset,offset+100).map(q=>q.id);quote_items.push(...await collect((a,b)=>db.from("quote_items").select("*").in("quote_id",ids).order("id").range(a,b)));quote_versions.push(...await collect((a,b)=>db.from("quote_versions").select("*").in("quote_id",ids).order("id").range(a,b)));}
    const photos=[],warranties=[],payments=[];for(let offset=0;offset<installations.length;offset+=100){const ids=installations.slice(offset,offset+100).map(i=>i.id);photos.push(...await collect((a,b)=>db.from("installation_photos").select("*").in("installation_id",ids).order("id").range(a,b)));warranties.push(...await collect((a,b)=>db.from("warranties").select("*").in("installation_id",ids).order("id").range(a,b)));payments.push(...await collect((a,b)=>db.from("payments").select("*").in("installation_id",ids).order("id").range(a,b)));}
    const logged=await db.rpc("log_contact_export",{p_contact_id:id});if(logged.error)throw new Error("No se pudo registrar la exportación");
    return Response.json({exported_at:new Date().toISOString(),contact:contact.data,leads,activities,tasks,appointments,quotes,quote_items,quote_versions,installations,photos,warranties,payments,reviews},{headers});
  } catch {return new Response("No se pudo exportar la ficha completa. Intenta nuevamente.",{status:503,headers:{"Cache-Control":"private, no-store"}});}
}
