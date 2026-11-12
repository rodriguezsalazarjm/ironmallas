import {z} from "zod";
import {fromSantiagoInput} from "@/features/crm/time";
const optional=(max:number)=>z.string().trim().max(max);
export const ZONE_OPTIONS={balcon:"Balcón",ventana:"Ventana",logia:"Logia",terraza:"Terraza",otra:"Otra"} as const;
export const appointmentSchema=z.object({
  id:z.union([z.uuid(),z.literal("")]), updated_at:z.string().max(60),
  contact_id:z.uuid(),lead_id:z.union([z.uuid(),z.literal("")]),
  kind:z.enum(["visit","evaluation","installation"]),service:z.string().trim().min(2).max(160),
  starts_at:z.string().min(1),ends_at:z.string().min(1),
  address:z.string().trim().min(3).max(240),commune:z.string().trim().min(2).max(60),
  building:optional(120).default(""),unit:optional(40).default(""),floor:optional(20).default(""),access_notes:optional(1000).default(""),
  zone_kind:z.union([z.enum(["balcon","ventana","logia","terraza","otra"]),z.literal("")]).default(""),
  technician_id:z.union([z.uuid(),z.literal("")]),status:z.enum(["scheduled","rescheduled","completed","cancelled"]),
  notes:z.string().trim().max(4000),result:z.string().trim().max(4000),
});
export function appointmentTimes(start:string,end:string) {
  const starts_at=fromSantiagoInput(start),ends_at=fromSantiagoInput(end);
  const duration=Date.parse(ends_at)-Date.parse(starts_at);
  if(duration<=0 || duration>24*60*60*1000) throw new Error("La duración debe ser mayor a cero y no superar 24 horas.");
  return {starts_at,ends_at};
}
/** Quick calendar edit (reschedule / reassign) for either source. Duration is optional for installations. */
export const quickScheduleSchema=z.object({
  source:z.enum(["appointment","installation"]),id:z.uuid(),updated_at:z.string().min(1).max(60),
  date:z.iso.date(),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration:z.union([z.coerce.number().int().min(15).max(1440),z.literal("")]),
  technician:z.union([z.uuid(),z.literal("")]),reason:z.string().trim().max(500),
});
export const cancelSchema=z.object({source:z.enum(["appointment","installation"]),id:z.uuid(),updated_at:z.string().min(1).max(60),reason:z.string().trim().min(3).max(500)});
export const appointmentLabels={visit:"Visita técnica",evaluation:"Evaluación",installation:"Instalación"} as const;
export const appointmentStatuses={scheduled:"Programada",rescheduled:"Reprogramada",completed:"Realizada",cancelled:"Cancelada"} as const;
