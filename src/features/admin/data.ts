import "server-only";
import { requireAdmin } from "@/lib/auth";

export async function getInbox(page = 1) {
  const { db } = await requireAdmin();
  const start = (page - 1) * 30;
  const [leads, statuses] = await Promise.all([
    db.from("leads").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(start, start + 29),
    db.from("lead_statuses").select("*").order("position"),
  ]);
  if (leads.error || statuses.error) throw new Error("No fue posible cargar las oportunidades.");
  const ids = [...new Set(leads.data.map(l => l.contact_id))];
  const contacts = ids.length ? await db.from("contacts").select("*").in("id", ids) : { data: [], error: null };
  if (contacts.error) throw new Error("No fue posible cargar los contactos.");
  return { leads: leads.data, statuses: statuses.data, contacts: contacts.data ?? [], total: leads.count ?? 0 };
}
export function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(value)) : "Sin programar";
}
