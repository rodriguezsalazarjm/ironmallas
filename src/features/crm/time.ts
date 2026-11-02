const zone = "America/Santiago";
function parts(date: Date) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
}
export function santiagoInput(value: string | null | undefined) {
  if (!value) return "";
  const p = parts(new Date(value));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
/** Resolve Chilean wall time on the server; reject nonexistent DST times. */
export function fromSantiagoInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Fecha inválida");
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) throw new Error("Fecha inválida");
  let candidate = wall;
  for (let i=0;i<3;i++) {
    const p = parts(new Date(candidate));
    const displayed = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);
    candidate += wall-displayed;
  }
  const candidates = [candidate-3600000,candidate,candidate+3600000].filter(t => santiagoInput(new Date(t).toISOString()) === value);
  if (!candidates.length) throw new Error("La hora no existe por cambio de horario en Santiago");
  return new Date(Math.min(...candidates)).toISOString();
}
