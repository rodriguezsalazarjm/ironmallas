/** Plain-text agenda emails rendered at send time from the current event state (no stale copies in the queue). */
export type AgendaKind = "agenda_scheduled" | "agenda_rescheduled" | "agenda_cancelled" | "agenda_reminder";
export type AgendaEmailInput = {
  kind: AgendaKind; audience: "client" | "admin"; entity: "appointment" | "installation";
  clientName: string; startsAt: string; durationMinutes: number | null; address: string; commune: string; access?: string | null;
  technician?: string | null; service: string; phone?: string | null;
  company: { name: string; phone: string; email: string };
  confirmUrl?: string | null; adminUrl?: string | null; near?: boolean;
};
const zone = "America/Santiago";
export function santiagoDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("es-CL", { timeZone: zone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d),
    time: new Intl.DateTimeFormat("es-CL", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d),
  };
}
const label = (entity: AgendaEmailInput["entity"]) => entity === "appointment" ? "visita técnica" : "instalación";

export function renderAgendaEmail(i: AgendaEmailInput): { subject: string; text: string } {
  const when = santiagoDateTime(i.startsAt); const what = label(i.entity);
  const place = `${i.address}, ${i.commune}`;
  if (i.audience === "admin") {
    const head = { agenda_scheduled: `Nueva ${what} agendada`, agenda_rescheduled: `${what[0].toUpperCase()}${what.slice(1)} reprogramada`, agenda_cancelled: `${what[0].toUpperCase()}${what.slice(1)} cancelada`, agenda_reminder: `Recordatorio: ${what} mañana` }[i.kind];
    return { subject: `[Agenda] ${head} · ${i.clientName} · ${when.date} ${when.time}`, text: [
      `${head}.`, "", `Cliente: ${i.clientName}${i.phone ? ` · ${i.phone}` : ""}`, `Tipo: ${what} · ${i.service}`, `Fecha: ${when.date}`, `Hora: ${when.time} (Santiago)${i.durationMinutes ? ` · ${i.durationMinutes} min` : " · duración por confirmar"}`,
      `Dirección: ${place}`, i.access ? `Acceso: ${i.access}` : "", `Técnico: ${i.technician || "sin asignar"}`, "", i.adminUrl ? `Ficha (requiere inicio de sesión): ${i.adminUrl}` : "",
    ].filter(l => l !== "").join("\n") };
  }
  const subject = {
    agenda_scheduled: i.entity === "appointment" ? "Tu visita técnica con Iron Mallas está agendada" : "Tu instalación con Iron Mallas está programada",
    agenda_rescheduled: `Cambiamos el horario de tu ${what} con Iron Mallas`,
    agenda_cancelled: `Tu ${what} con Iron Mallas fue cancelada`,
    agenda_reminder: `Recordatorio: mañana es tu ${what} con Iron Mallas`,
  }[i.kind];
  const intro = {
    agenda_scheduled: `Tu ${what} quedó agendada.`,
    agenda_rescheduled: `Tu ${what} tiene un nuevo horario.`,
    agenda_cancelled: `Tu ${what} programada para el ${when.date} a las ${when.time} fue cancelada. Si quieres coordinar una nueva fecha, contáctanos.`,
    agenda_reminder: `Te recordamos tu ${what} de mañana.`,
  }[i.kind];
  const details = i.kind === "agenda_cancelled" ? [] : [`Fecha: ${when.date}`, `Hora: ${when.time} (hora de Santiago)`, `Dirección: ${place}`, `Servicio: ${i.service}`];
  const confirm = i.confirmUrl && i.kind !== "agenda_cancelled" ? ["", i.near && i.kind !== "agenda_reminder" ? "Como la cita es en menos de 24 horas, te pedimos confirmar tu asistencia ahora:" : "Confirma tu asistencia aquí:", i.confirmUrl, "Si no puedes asistir, respóndenos o escríbenos para reprogramar."] : [];
  return { subject, text: [`Hola ${i.clientName.split(" ")[0]}:`, "", intro, ...(details.length ? ["", ...details] : []), ...confirm, "", `${i.company.name}`, `Teléfono / WhatsApp: ${i.company.phone}`, `Correo: ${i.company.email}`].join("\n") };
}
