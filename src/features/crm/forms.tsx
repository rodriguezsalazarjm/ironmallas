"use client";
import {Button} from "@/components/admin/ui/button";
import {useActionState} from "react";
import type {Contact,Profile,Lead,Task} from "@/lib/supabase/database.types";
import {saveContact,createManualLead,assignLead,createTask,setTaskStatus} from "./actions";
import {Field,fieldClass,primaryClass} from "./ui";
export function ContactForm({contact}:{contact?:Contact}) {
  const [message,action,pending]=useActionState(saveContact,"");
  const fields = [
    ["name","Nombre completo",80,true],["phone","Teléfono",24,true],["email","Correo electrónico (opcional)",120,false],
    ["whatsapp","WhatsApp (si es distinto)",24,false],["address","Dirección",240,false],["unit","Departamento o unidad",80,false],
    ["commune","Comuna",60,false],["region","Región",100,false],["location_url","Ubicación (enlace HTTPS)",500,false],
    ["source","Origen comercial",120,true],
  ] as const;
  return <form action={action} className="grid gap-4 sm:grid-cols-2"><input type="hidden" name="id" value={contact?.id ?? ""}/><input type="hidden" name="updated_at" value={contact?.updated_at ?? ""}/>
    {fields.map(([name,label,maxLength,required]) => <Field key={name} label={`${label}${required ? " *":""}`}><input className={fieldClass} name={name} type={name === "email" ? "email" : name === "phone" || name === "whatsapp" ? "tel" : name === "location_url" ? "url" : "text"} defaultValue={contact?.[name] ?? (name === "source" ? "manual" : "")} maxLength={maxLength} required={required}/></Field>)}
    <Field label="Notas internas" className="sm:col-span-2"><textarea className={fieldClass} name="notes" rows={4} maxLength={4000} defaultValue={contact?.notes ?? ""}/></Field>
    <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="is_client" defaultChecked={contact?.is_client}/> Cliente (existe un trabajo o relación comercial confirmada)</label>
    <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="consent" defaultChecked={contact?.consent}/> Consta autorización del contacto para usar sus datos en esta solicitud. No marcar sin autorización real.</label>
    <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="allow_duplicate"/> Revisé la coincidencia de teléfono/correo y confirmo que se trata de otra persona (solo si aparece una advertencia).</label>
    <p role="status" className="text-sm text-navy-700 sm:col-span-2">{message}</p><Button className={primaryClass} disabled={pending}>{pending ? "Guardando…":"Guardar contacto"}</Button>
  </form>;
}
export function ManualLeadForm({contacts,profiles,services,contactId}:{contacts:Contact[];profiles:Pick<Profile,"id"|"full_name">[];services:readonly string[];contactId?:string}) {
  const [message,action,pending]=useActionState(createManualLead,"");
  return <form action={action} className="grid gap-4"><Field label="Contacto *"><select name="contact_id" className={fieldClass} required defaultValue={contactId ?? ""}><option value="" disabled>Selecciona un contacto</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}{!c.consent ? " · falta consentimiento":""}</option>)}</select></Field>
    <Field label="Servicio *"><input name="service" list="crm-services" className={fieldClass} required maxLength={160}/><datalist id="crm-services">{services.map(s=><option key={s} value={s}/>)}</datalist></Field>
    <Field label="Responsable"><select name="assigned_to" className={fieldClass}><option value="">Sin asignar</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
    <Field label="Solicitud"><textarea name="message" className={fieldClass} maxLength={1500} rows={4}/></Field>
    <p role="status" className="text-sm text-navy-700">{message}</p><Button className={primaryClass} disabled={pending || !contacts.length}>{pending?"Guardando…":"Crear oportunidad"}</Button></form>;
}
export function AssignmentForm({lead,profiles}:{lead:Lead;profiles:Pick<Profile,"id"|"full_name">[]}) {
  const [message,action,pending]=useActionState(assignLead,"");
  return <form action={action} className="grid gap-3"><input type="hidden" name="id" value={lead.id}/><Field label="Responsable"><select className={fieldClass} name="assigned_to" defaultValue={lead.assigned_to ?? ""}><option value="">Sin asignar</option>{lead.assigned_to && !profiles.some(p=>p.id===lead.assigned_to) && <option value={lead.assigned_to}>Responsable inactivo · elige una nueva asignación</option>}{profiles.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field><Button className={primaryClass} disabled={pending}>Guardar responsable</Button><p role="status" className="text-sm">{message}</p></form>;
}
export function TaskForm({contactId,leads,profiles}:{contactId:string;leads:Pick<Lead,"id"|"service">[];profiles:Pick<Profile,"id"|"full_name">[]}) {
  const [message,action,pending]=useActionState(createTask,"");
  return <form action={action} className="grid gap-3"><input type="hidden" name="contact_id" value={contactId}/><Field label="Tarea *"><input className={fieldClass} name="title" required minLength={2} maxLength={160}/></Field><Field label="Fecha y hora (Santiago) *"><input className={fieldClass} name="due_at" type="datetime-local" required/></Field><Field label="Oportunidad"><select name="lead_id" className={fieldClass}><option value="">General del contacto</option>{leads.map(l=><option key={l.id} value={l.id}>{l.service} · {l.id.slice(0,8)}</option>)}</select></Field><Field label="Responsable"><select name="assigned_to" className={fieldClass}><option value="">Sin asignar</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field><Field label="Notas"><textarea name="notes" className={fieldClass} maxLength={2000} rows={3}/></Field><p role="status" className="text-sm">{message}</p><Button className={primaryClass} disabled={pending}>{pending?"Guardando…":"Programar seguimiento"}</Button></form>;
}
export function TaskStatusForm({task}:{task:Task}) {
  const [message,action,pending]=useActionState(setTaskStatus,"");
  return <form action={action} className="mt-3 flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={task.id}/><label className="sr-only" htmlFor={`task-${task.id}`}>Estado de {task.title}</label><select id={`task-${task.id}`} name="status" defaultValue={task.status} className={fieldClass + " max-w-48"}><option value="pending">Pendiente</option><option value="completed">Completada</option><option value="cancelled">Cancelada</option></select><Button className={primaryClass} disabled={pending}>Actualizar</Button><p className="w-full text-sm" role="status">{message}</p></form>;
}
