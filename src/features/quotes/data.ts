import "server-only";
import { requireAdmin } from "@/lib/auth";
import { commercialSchema } from "@/features/pricing/schema";
export async function quoteEditorData(query="",selectedContact?:string){
  const {db,profile}=await requireAdmin();
  const safe=query.trim().replace(/[%_,().]/g," ").slice(0,80);
  let contactQuery=db.from("contacts").select("*").order("name").limit(50);
  if(safe)contactQuery=contactQuery.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`);
  const [contacts,rules,commercial,services]=await Promise.all([contactQuery,db.from("pricing_rules").select("*").eq("active",true).order("name"),db.from("settings").select("value").eq("key","commercial").maybeSingle(),db.from("services").select("*").eq("active",true).order("name")]);
  if(contacts.error||rules.error||commercial.error||services.error)throw new Error("No fue posible cargar el cotizador.");
  if(selectedContact&&!contacts.data.some(c=>c.id===selectedContact)){
    const extra=await db.from("contacts").select("*").eq("id",selectedContact).maybeSingle();
    if(extra.error)throw new Error("No fue posible cargar el cliente.");
    if(extra.data)contacts.data.unshift(extra.data);
  }
  const parsed=commercialSchema.safeParse(commercial.data?.value);
  const activeServices=new Set(services.data.map(s=>s.id));
  return {contacts:contacts.data,rules:rules.data.filter(r=>!r.service_id||activeServices.has(r.service_id)),services:services.data,commercial:parsed.success?parsed.data:null,superadmin:profile.role==="SUPERADMIN"};
}
export const quoteStates:Record<string,string>={draft:"Borrador",sent:"Enviada",accepted:"Aceptada",rejected:"Rechazada",expired:"Vencida"};
