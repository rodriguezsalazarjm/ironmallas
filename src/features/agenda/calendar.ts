import { fromSantiagoInput, santiagoInput } from "@/features/crm/time";

export const AGENDA_VIEWS = { day: "Día", week: "Semana", month: "Mes", year: "Año", list: "Listado" } as const;
export type AgendaView = keyof typeof AGENDA_VIEWS;
export const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const KEY = /^(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/** Calendar arithmetic on Santiago date keys (YYYY-MM-DD) using UTC dates as plain calendar values. */
export function parseKey(key: string) { const m = KEY.exec(key); if (!m) return null; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.toISOString().slice(0, 10) === key ? d : null; }
export const keyOf = (d: Date) => d.toISOString().slice(0, 10);
export function addDays(key: string, days: number) { const d = parseKey(key)!; d.setUTCDate(d.getUTCDate() + days); return keyOf(d); }
export function addMonths(key: string, months: number) { const d = parseKey(key)!; return keyOf(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1))); }
export const weekday = (key: string) => (parseKey(key)!.getUTCDay() + 6) % 7;
export const startOfWeek = (key: string) => addDays(key, -weekday(key));
export const startOfMonth = (key: string) => `${key.slice(0, 7)}-01`;
export const startOfYear = (key: string) => `${key.slice(0, 4)}-01-01`;
export const daysInMonth = (key: string) => { const d = parseKey(startOfMonth(key))!; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); };
export const todayKey = (now = new Date()) => santiagoInput(now.toISOString()).slice(0, 10);
export const dayKeyOf = (iso: string) => santiagoInput(iso).slice(0, 10);
export const timeOf = (iso: string) => santiagoInput(iso).slice(11, 16);

/** UTC instant of local midnight. Chile's DST change happens at midnight, so 00:00 may not exist. */
export function dayStart(key: string) {
  try { return fromSantiagoInput(`${key}T00:00`); } catch { return fromSantiagoInput(`${key}T01:00`); }
}

export function viewRange(view: AgendaView, key: string): { first: string; last: string; from: string; to: string } {
  let first: string, last: string;
  if (view === "day") { first = key; last = key; }
  else if (view === "week") { first = startOfWeek(key); last = addDays(first, 6); }
  else if (view === "month") { first = startOfWeek(startOfMonth(key)); last = addDays(startOfWeek(addDays(addMonths(key, 1), -1)), 6); }
  else if (view === "year") { first = startOfYear(key); last = addDays(`${+key.slice(0, 4) + 1}-01-01`, -1); }
  else { first = startOfMonth(key); last = addDays(addMonths(key, 1), -1); }
  return { first, last, from: dayStart(first), to: dayStart(addDays(last, 1)) };
}

export function shift(view: AgendaView, key: string, direction: 1 | -1) {
  if (view === "day") return addDays(key, direction);
  if (view === "week") return addDays(key, 7 * direction);
  if (view === "year") return `${+key.slice(0, 4) + direction}${key.slice(4, 7)}-01`;
  return addMonths(key, direction);
}

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CL", { ...options, timeZone: "UTC" });
export function rangeTitle(view: AgendaView, key: string) {
  const d = parseKey(key)!;
  if (view === "day") return fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  if (view === "week") { const a = parseKey(startOfWeek(key))!, b = parseKey(addDays(startOfWeek(key), 6))!; return `${fmt({ day: "numeric", month: "short" }).format(a)} – ${fmt({ day: "numeric", month: "short", year: "numeric" }).format(b)}`; }
  if (view === "year") return key.slice(0, 4);
  return fmt({ month: "long", year: "numeric" }).format(d);
}
export const monthName = (month: number) => fmt({ month: "long" }).format(new Date(Date.UTC(2026, month, 1)));
export const dayLabel = (key: string) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(parseKey(key)!);
