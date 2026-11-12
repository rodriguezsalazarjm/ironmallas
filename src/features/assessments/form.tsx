"use client";
import {useState} from "react";
import {ActionForm} from "@/components/admin/action-form";
import {Button} from "@/components/admin/ui/button";
import {Field,fieldClass} from "@/features/crm/ui";
import {ZONE_KINDS,linearLabel,metersToMm} from "@/features/quotes/quick";
import type {TechnicalAssessment} from "@/lib/supabase/database.types";
import {saveAssessment} from "./actions";
import {ASSESSMENT_TEXT_FIELDS} from "./schema";

type ZoneRow={kind:keyof typeof ZONE_KINDS;description:string;width:string;height:string;quantity:string;notes:string};
const meters=(mm:number)=>(mm/1000).toString().replace(".",",");

export function AssessmentForm({target,targetId,assessment,defaultZone}:{target:"appointment"|"installation";targetId:string;assessment:TechnicalAssessment|null;defaultZone?:keyof typeof ZONE_KINDS|null}){
  const [rows,setRows]=useState<ZoneRow[]>(()=>assessment?.zones.length?assessment.zones.map(z=>({kind:z.kind,description:z.description,width:meters(z.width_mm),height:meters(z.height_mm),quantity:String(z.quantity),notes:z.notes})):[{kind:defaultZone??"balcon",description:"",width:"",height:"",quantity:"1",notes:""}]);
  const zones=rows.map(r=>({kind:r.kind,description:r.description.trim(),width_mm:metersToMm(r.width),height_mm:metersToMm(r.height),quantity:Number(r.quantity),notes:r.notes.trim()}));
  const filled=zones.filter(z=>z.width_mm||z.height_mm);
  const invalid=filled.some(z=>!z.width_mm||!z.height_mm||!Number.isInteger(z.quantity)||z.quantity<1);
  const linear=filled.reduce((sum,z)=>sum+((z.width_mm??0)+(z.height_mm??0))*(z.quantity||0),0);
  const set=(i:number,patch:Partial<ZoneRow>)=>setRows(rows.map((r,j)=>j===i?{...r,...patch}:r));
  return <ActionForm action={saveAssessment} label="Guardar ficha técnica">
    <input type="hidden" name="target" value={target}/><input type="hidden" name="target_id" value={targetId}/>
    <input type="hidden" name="id" value={assessment?.id??""}/><input type="hidden" name="updated_at" value={assessment?.updated_at??""}/>
    <input type="hidden" name="zones" value={invalid?"invalid":JSON.stringify(filled)}/>
    <fieldset className="grid gap-3"><legend className="mb-2 text-sm font-semibold">Zonas medidas (metros)</legend>
      {rows.map((r,i)=><div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-6">
        <Field label="Zona" className="sm:col-span-2"><select className={fieldClass} value={r.kind} onChange={e=>set(i,{kind:e.target.value as ZoneRow["kind"]})}>{Object.entries(ZONE_KINDS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Ancho (m)"><input className={fieldClass} inputMode="decimal" value={r.width} onChange={e=>set(i,{width:e.target.value})} placeholder="2,40"/></Field>
        <Field label="Alto (m)"><input className={fieldClass} inputMode="decimal" value={r.height} onChange={e=>set(i,{height:e.target.value})} placeholder="1,10"/></Field>
        <Field label="Cantidad"><input className={fieldClass} type="number" min={1} max={1000} value={r.quantity} onChange={e=>set(i,{quantity:e.target.value})}/></Field>
        <div className="flex items-end"><Button type="button" variant="outline" onClick={()=>setRows(rows.filter((_,j)=>j!==i))} disabled={rows.length===1}>Quitar</Button></div>
        <Field label="Descripción" className="sm:col-span-3"><input className={fieldClass} value={r.description} maxLength={200} onChange={e=>set(i,{description:e.target.value})}/></Field>
        <Field label="Notas" className="sm:col-span-3"><input className={fieldClass} value={r.notes} maxLength={500} onChange={e=>set(i,{notes:e.target.value})}/></Field>
      </div>)}
      <div className="flex flex-wrap items-center justify-between gap-2"><Button type="button" variant="outline" disabled={rows.length>=30} onClick={()=>setRows([...rows,{kind:"ventana",description:"",width:"",height:"",quantity:"1",notes:""}])}>Añadir zona</Button>
        <p className="text-sm" role="status">{invalid?"Completa ancho y alto válidos (hasta 3 decimales).":`${filled.length} zonas · ${linearLabel(linear)} m lineales (ancho + alto) × cantidad`}</p></div>
    </fieldset>
    <div className="grid gap-3 sm:grid-cols-3"><Field label="Tipo de malla"><input className={fieldClass} name="mesh_type" maxLength={120} defaultValue={assessment?.mesh_type??""}/></Field>
      <Field label="Pilares 2,00 m"><input className={fieldClass} type="number" name="pillars_200" min={0} max={100} defaultValue={assessment?.pillars_200??0}/></Field>
      <Field label="Pilares 2,40 m"><input className={fieldClass} type="number" name="pillars_240" min={0} max={100} defaultValue={assessment?.pillars_240??0}/></Field></div>
    <div className="grid gap-3 sm:grid-cols-2">{ASSESSMENT_TEXT_FIELDS.map(([name,label])=><Field key={name} label={label}><textarea className={fieldClass} name={name} rows={2} maxLength={name==="observations"||name==="recommendations"?4000:1000} defaultValue={assessment?.[name]??""}/></Field>)}</div>
  </ActionForm>;
}
