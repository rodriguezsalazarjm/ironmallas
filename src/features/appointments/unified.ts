import type { Appointment, Installation } from "@/lib/supabase/database.types";

export const agendaStatuses = { scheduled: "Programada", rescheduled: "Reprogramada", in_progress: "En ejecución", pending: "Pendiente", completed: "Realizada", cancelled: "Cancelada" } as const;
export type AgendaStatus = keyof typeof agendaStatuses;
export type AgendaEntry = {
  id: string; source: "appointment" | "installation"; kind: Appointment["kind"]; service: string;
  contact_id: string; lead_id: string | null; quote_id: string | null;
  starts_at: string; ends_at: string | null; duration_minutes: number | null;
  address: string; commune: string; technician_id: string | null; status: AgendaStatus; notes: string | null; result: string | null;
  attendance_status: "pending" | "confirmed"; cal_sync_status: Appointment["cal_sync_status"]; booking_source: Appointment["source"] | "installation";
  cal_booking_uid: string | null; created_by: string | null; created_at: string; updated_at: string; href: string;
};
export type AgendaFilter = {
  from: string; to: string; status?: string; kind?: string; upcoming?: boolean; now: string;
  technician?: string; q?: string; names?: Record<string, string>;
};

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Installations own their schedule. Linked appointment records are historical,
 * never a second editable schedule. No synthetic duration is assigned to work:
 * an installation only has an end when `duration_minutes` was recorded.
 * Deduplication is by the explicit link `installations.appointment_id`, never by date, time or client.
 */
export function unifiedAgenda(appointments: Appointment[], installations: Installation[], filter: AgendaFilter): AgendaEntry[] {
  const linked = new Set(installations.flatMap(job => job.appointment_id ? [job.appointment_id] : []));
  const entries: AgendaEntry[] = appointments.filter(item => !linked.has(item.id)).map(item => ({
    id: item.id, source: "appointment", kind: item.kind, service: item.service, contact_id: item.contact_id, lead_id: item.lead_id, quote_id: null,
    starts_at: item.starts_at, ends_at: item.ends_at, duration_minutes: Math.round((Date.parse(item.ends_at) - Date.parse(item.starts_at)) / 60000),
    address: item.address, commune: item.commune, technician_id: item.technician_id, status: item.status, notes: item.notes, result: item.result,
    attendance_status: item.attendance_status ?? "pending", cal_sync_status: item.cal_sync_status ?? "none", booking_source: item.source ?? "admin",
    cal_booking_uid: item.cal_booking_uid, created_by: item.created_by, created_at: item.created_at, updated_at: item.updated_at,
    href: `/admin/agenda/${item.id}`,
  }));
  for (const job of new Map(installations.map(job => [job.id, job])).values()) {
    if (!job.scheduled_at) continue;
    const duration = job.duration_minutes ?? null;
    entries.push({
      id: job.id, source: "installation", kind: "installation", service: job.service, contact_id: job.contact_id, lead_id: job.lead_id, quote_id: job.quote_id,
      starts_at: job.scheduled_at, ends_at: duration ? new Date(Date.parse(job.scheduled_at) + duration * 60000).toISOString() : null, duration_minutes: duration,
      address: job.address, commune: job.commune, technician_id: job.technician_id, status: job.status, notes: job.notes, result: null,
      attendance_status: job.attendance_status ?? "pending", cal_sync_status: "none", booking_source: "installation",
      cal_booking_uid: null, created_by: job.created_by, created_at: job.created_at, updated_at: job.updated_at,
      href: `/admin/instalaciones/${job.id}`,
    });
  }
  const q = filter.q ? fold(filter.q.trim()) : "";
  return entries.filter(item => {
    const time = Date.parse(item.starts_at);
    return time >= Date.parse(filter.from) && time < Date.parse(filter.to) &&
      (!filter.status || item.status === filter.status) &&
      (!filter.kind || (filter.kind === "visits" ? ["visit", "evaluation"].includes(item.kind) : item.kind === filter.kind)) &&
      (!filter.technician || (filter.technician === "none" ? !item.technician_id : item.technician_id === filter.technician)) &&
      (!q || fold(`${filter.names?.[item.contact_id] ?? ""} ${item.address} ${item.commune} ${item.service}`).includes(q)) &&
      (!filter.upcoming || (time >= Date.parse(filter.now) && !["cancelled", "completed"].includes(item.status)));
  }).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id));
}

/** Visits and installations are told apart by label and icon, not only by colour. */
export function isVisit(entry: Pick<AgendaEntry, "kind">) { return entry.kind !== "installation"; }
