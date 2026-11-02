import {z} from "zod";
import {fromSantiagoInput} from "@/features/crm/time";
export const appointmentSchema=z.object({
  id:z.union([z.uuid(),z.literal("")]), updated_at:z.string().max(60),
  contact_id:z.uuid(),lead_id:z.union([z.uuid(),z.literal("")]),
  kind:z.enum(["visit","evaluation","installation"]),service:z.string().trim().min(2).max(160),
  starts_at:z.string().min(1),ends_at:z.string().min(1),
  address:z.string().trim().min(3).max(240),commune:z.string().trim().min(2).max(60),
  technician_id:z.union([z.uuid(),z.literal("")]),status:z.enum(["scheduled","rescheduled","completed","cancelled"]),
  notes:z.string().trim().max(4000),result:z.string().trim().max(4000),
});
export function appointmentTimes(start:string,end:string) {
  const starts_at=fromSantiagoInput(start),ends_at=fromSantiagoInput(end);
  const duration=Date.parse(ends_at)-Date.parse(starts_at);
  if(duration<=0 || duration>24*60*60*1000) throw new Error("La duración debe ser mayor a cero y no superar 24 horas.");
  return {starts_at,ends_at};
}
export const appointmentLabels={visit:"Visita técnica",evaluation:"Evaluación",installation:"Instalación"} as const;
export const appointmentStatuses={scheduled:"Programada",rescheduled:"Reprogramada",completed:"Realizada",cancelled:"Cancelada"} as const;
