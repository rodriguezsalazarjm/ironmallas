import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import type { DashboardPeriod } from "./period";
const metric=z.number().int().nonnegative();
const metricsSchema=z.object({fresh_leads:metric,pending_contact_leads:metric,sent_quotes:metric,awaiting_quotes:metric,accepted_quotes:metric,approved_amount:metric,upcoming_visits:metric,scheduled_installations:metric,completed_installations:metric,income:metric,overdue_tasks:metric,overdue_leads:metric});
export async function dashboardData(period:DashboardPeriod){
  const {db}=await requireAdmin();const now=new Date().toISOString();
  const [metrics,visits,tasks,activities,audit,statuses,recent]=await Promise.all([
    db.rpc("dashboard_metrics",{p_from:period.from,p_to:period.to,p_now:now}),
    db.from("appointments").select("id,contact_id,starts_at,service,kind,status").in("kind",["visit","evaluation"]).in("status",["scheduled","rescheduled"]).gte("starts_at",now).gte("starts_at",period.from).lt("starts_at",period.to).order("starts_at").limit(8),
    db.from("tasks").select("id,contact_id,title,due_at,status").eq("status","pending").lt("due_at",now).order("due_at").limit(8),
    db.from("lead_activities").select("*").gte("created_at",period.from).lt("created_at",period.to).order("created_at",{ascending:false}).limit(8),
    db.from("audit_logs").select("id,entity,entity_id,action,created_at").gte("created_at",period.from).lt("created_at",period.to).order("created_at",{ascending:false}).limit(8),
    db.from("lead_statuses").select("id,key,is_final,name"),
    db.from("leads").select("id,contact_id,service,source,status_id,created_at,next_action").order("created_at",{ascending:false}).limit(6),
  ]);
  if(recent.error||metrics.error||visits.error||tasks.error||activities.error||audit.error||statuses.error)throw new Error("No fue posible cargar el resumen operativo.");
  const parsed=metricsSchema.safeParse(metrics.data);if(!parsed.success)throw new Error("El resumen devolvió datos incompletos.");
  const openIds=statuses.data.filter(s=>!s.is_final).map(s=>s.id);
  const leads=await db.from("leads").select("id,contact_id,next_follow_up_at,status_id").in("status_id",openIds).not("next_follow_up_at","is",null).lt("next_follow_up_at",now).order("next_follow_up_at").limit(8);
  if(leads.error)throw new Error("No se pudieron cargar los seguimientos.");
  const overdueLeads=leads.data;
  const contactIds=[...new Set([...visits.data.map(v=>v.contact_id),...tasks.data.map(t=>t.contact_id),...overdueLeads.map(l=>l.contact_id),...recent.data.map(l=>l.contact_id)])];
  const contacts=contactIds.length?await db.from("contacts").select("id,name").in("id",contactIds):{data:[],error:null};
  if(contacts.error)throw new Error("No se pudieron cargar los contactos.");
  return {metrics:parsed.data,visits:visits.data,tasks:tasks.data,activities:activities.data,audit:audit.data,overdueLeads,contacts:contacts.data??[],newStatusId:statuses.data.find(s=>s.key==="new")?.id,recentLeads:recent.data,statuses:statuses.data};
}
