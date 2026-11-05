/** Date-only commercial validity follows the business timezone, including Chilean DST. */
export function chileToday(now=new Date()):string{
  const parts=new Intl.DateTimeFormat("en",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const part=(type:string)=>parts.find(p=>p.type===type)?.value??"";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
