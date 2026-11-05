import type { Appointment, Installation } from "@/lib/supabase/database.types";

export const agendaStatuses = { scheduled: "Programada", rescheduled: "Reprogramada", in_progress: "En ejecución", pending: "Pendiente", completed: "Realizada", cancelled: "Cancelada" } as const;
export type AgendaEntry = Omit<Appointment, "status" | "ends_at"> & {
  status: keyof typeof agendaStatuses; ends_at: string | null; href: string; source: "appointment" | "installation";
};

/** Installations own their schedule. Linked appointment records are historical,
 * never a second editable schedule. No synthetic duration is assigned to work.
 */
export function unifiedAgenda(appointments: Appointment[], installations: Installation[], filter: {
  from: string; to: string; status?: string; kind?: string; upcoming?: boolean; now: string;
}): AgendaEntry[] {
  const linked = new Set(installations.flatMap(job => job.appointment_id ? [job.appointment_id] : []));
  const entries: AgendaEntry[] = appointments.filter(item => !linked.has(item.id)).map(item => ({
    ...item, href: `/admin/agenda/${item.id}`, source: "appointment",
  }));
  for (const job of new Map(installations.map(job => [job.id, job])).values()) {
    if (!job.scheduled_at) continue;
    entries.push({
      id: job.id, contact_id: job.contact_id, lead_id: job.lead_id, kind: "installation", service: job.service,
      starts_at: job.scheduled_at, ends_at: null, address: job.address, commune: job.commune,
      technician_id: job.technician_id, status: job.status, notes: job.notes, result: null,
      created_by: job.created_by, created_at: job.created_at, updated_at: job.updated_at,
      cal_booking_uid: null,
      source: "installation", href: `/admin/instalaciones/${job.id}`,
    });
  }
  return entries.filter(item => {
    const time = Date.parse(item.starts_at);
    return time >= Date.parse(filter.from) && time < Date.parse(filter.to) &&
      (!filter.status || item.status === filter.status) &&
      (!filter.kind || (filter.kind === "visits" ? ["visit", "evaluation"].includes(item.kind) : item.kind === filter.kind)) &&
      (!filter.upcoming || (time >= Date.parse(filter.now) && !["cancelled", "completed"].includes(item.status)));
  }).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id));
}
