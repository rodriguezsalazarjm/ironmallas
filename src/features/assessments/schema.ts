import {z} from "zod";
const text=(max:number)=>z.string().trim().max(max);
export const assessmentZoneSchema=z.object({
  kind:z.enum(["balcon","ventana","logia","terraza","otra"]),description:text(200),
  width_mm:z.number().int().min(1).max(100000),height_mm:z.number().int().min(1).max(100000),quantity:z.number().int().min(1).max(1000),notes:text(500),
});
export const assessmentSchema=z.object({
  target:z.enum(["appointment","installation"]),target_id:z.uuid(),id:z.union([z.uuid(),z.literal("")]),updated_at:z.string().max(60),
  zones:z.array(assessmentZoneSchema).max(30),mesh_type:text(120),
  pillars_200:z.coerce.number().int().min(0).max(100),pillars_240:z.coerce.number().int().min(0).max(100),
  anchoring:text(1000),wall_condition:text(1000),access_difficulties:text(1000),additional_materials:text(1000),observations:text(4000),recommendations:text(4000),
});
export const ASSESSMENT_TEXT_FIELDS=[["anchoring","Condiciones de anclaje"],["wall_condition","Estado de los muros"],["access_difficulties","Dificultades de acceso"],["additional_materials","Materiales adicionales"],["observations","Observaciones técnicas"],["recommendations","Recomendaciones del técnico"]] as const;
export const PHOTO_STAGES={before:"Antes",after:"Después",detail:"Detalle",incident:"Incidencia"} as const;
