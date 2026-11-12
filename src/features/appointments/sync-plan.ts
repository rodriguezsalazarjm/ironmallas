/**
 * Decide how an admin change to an appointment must reach Cal.com before touching Supabase.
 * Strategy (consistent everywhere): Cal.com first. If the external booking cannot be updated,
 * the internal schedule keeps its previous state and the error is shown — never reported as synced.
 */
export type AppointmentSnapshot = { starts_at: string; ends_at: string; status: "scheduled" | "rescheduled" | "completed" | "cancelled"; cal_booking_uid: string | null };
export type AppointmentChange = { starts_at: string; ends_at: string; status: AppointmentSnapshot["status"] };
export type SyncPlan =
  | { ok: true; cal: "none" | "reschedule" | "cancel"; next: AppointmentChange }
  | { ok: false; error: string };

const active = (status: AppointmentSnapshot["status"]) => status === "scheduled" || status === "rescheduled";

export function planAppointmentChange(current: AppointmentSnapshot, requested: AppointmentChange, calConfigured: boolean): SyncPlan {
  const moved = Date.parse(current.starts_at) !== Date.parse(requested.starts_at) || Date.parse(current.ends_at) !== Date.parse(requested.ends_at);
  let status = requested.status;
  if (moved && active(status)) status = "rescheduled";
  if (!current.cal_booking_uid) return { ok: true, cal: "none", next: { ...requested, status } };
  if (current.status === "cancelled" && active(status)) return { ok: false, error: "La reserva fue cancelada en Cal.com. Crea una nueva cita para reactivarla." };
  const cancelling = active(current.status) && status === "cancelled";
  if (cancelling) {
    if (!calConfigured) return { ok: false, error: "Esta visita proviene de Cal.com y la API no está configurada (CAL_API_KEY). Cancélala en Cal.com: la agenda se actualizará al recibir el webhook. No se cambió nada." };
    return { ok: true, cal: "cancel", next: { starts_at: current.starts_at, ends_at: current.ends_at, status: "cancelled" } };
  }
  if (moved && active(status)) {
    if (!calConfigured) return { ok: false, error: "Esta visita proviene de Cal.com y la API no está configurada (CAL_API_KEY). Reprograma en Cal.com o configura la API. El horario no cambió." };
    // Cal.com fixes the event length; keep the booked duration instead of inventing a new one.
    const duration = Date.parse(current.ends_at) - Date.parse(current.starts_at);
    const ends = new Date(Date.parse(requested.starts_at) + duration).toISOString();
    return { ok: true, cal: "reschedule", next: { starts_at: new Date(Date.parse(requested.starts_at)).toISOString(), ends_at: ends, status } };
  }
  return { ok: true, cal: "none", next: { ...requested, starts_at: current.starts_at, ends_at: current.ends_at, status } };
}

/** Map Postgres errors raised by the scheduling guard into operator-facing messages. */
export function scheduleErrorMessage(error: { code?: string; message?: string } | null | undefined, fallback: string) {
  if (error?.code === "23P01" || /Schedule conflict/i.test(error?.message ?? "")) return "El técnico ya tiene otro trabajo en ese horario (considerando duración y margen). Elige otro horario o técnico.";
  return fallback;
}
