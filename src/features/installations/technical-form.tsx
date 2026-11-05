"use client";
import {useState} from "react";
import {ActionForm} from "@/components/admin/action-form";
import {Button} from "@/components/admin/ui/button";
import {fieldClass} from "@/features/crm/ui";
import {saveTechnicalData} from "./actions";
export function TechnicalForm({id,updatedAt,data}:{id:string;updatedAt:string;data:unknown}){
  const [fields,setFields]=useState(Object.entries(data&&typeof data==="object"?data:{}).map(([label,value])=>({label,value:String(value)})));
  return <ActionForm action={saveTechnicalData} label="Guardar ficha técnica"><input type="hidden" name="id" value={id}/><input type="hidden" name="updated_at" value={updatedAt}/><input type="hidden" name="data" value={JSON.stringify(fields)}/>{fields.map((f,i)=><div className="grid gap-2 rounded-xl border border-line p-3" key={i}><label className="text-sm">Campo<input aria-label={`Nombre campo ${i+1}`} className={fieldClass} value={f.label} maxLength={80} onChange={e=>setFields(fields.map((item,j)=>j===i?{...item,label:e.target.value}:item))}/></label><label className="text-sm">Detalle<textarea aria-label={`Valor campo ${i+1}`} className={fieldClass} value={f.value} maxLength={1000} onChange={e=>setFields(fields.map((item,j)=>j===i?{...item,value:e.target.value}:item))}/></label><Button type="button" variant="outline" onClick={()=>setFields(fields.filter((_,j)=>j!==i))}>Quitar campo</Button></div>)}<Button type="button" variant="outline" disabled={fields.length>=30} onClick={()=>setFields([...fields,{label:"",value:""}])}>Añadir dato técnico</Button></ActionForm>;
}
