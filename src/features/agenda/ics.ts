import { dayKeyOf, addDays, dayStart } from "./calendar";

/**
 * Private busy-time feed (iCalendar, RFC 5545) for Cal.com's "ICS Feed" calendar app (conflict checking).
 * Contains no customer data: only opaque "Ocupado" blocks. Cal.com bookings are excluded (Cal.com already knows them).
 * Unknown installation duration blocks until the end of that local day (conservative, never an invented end time shown in the panel).
 */
export type BusyBlock = { uid: string; starts_at: string; ends_at: string | null };
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function busyEnd(block: BusyBlock, bufferMinutes: number) {
  const end = block.ends_at ?? dayStart(addDays(dayKeyOf(block.starts_at), 1));
  return new Date(Date.parse(end) + bufferMinutes * 60000).toISOString();
}
export function buildBusyCalendar(blocks: BusyBlock[], bufferMinutes: number, now = new Date()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Iron Mallas//Agenda ocupada//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Iron Mallas · ocupado"];
  for (const b of blocks) {
    lines.push("BEGIN:VEVENT", `UID:${b.uid.replace(/[^a-z0-9:-]/gi, "")}@ironmallas`, `DTSTAMP:${stamp(now.toISOString())}`,
      `DTSTART:${stamp(new Date(Date.parse(b.starts_at) - bufferMinutes * 60000).toISOString())}`, `DTEND:${stamp(busyEnd(b, bufferMinutes))}`,
      "SUMMARY:Ocupado", "TRANSP:OPAQUE", "CLASS:PRIVATE", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
