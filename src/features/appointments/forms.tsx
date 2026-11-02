"use client";
import {Button} from "@/components/admin/ui/button";
import {useActionState,useState} from "react";
import type {Appointment,Contact,Lead,Profile} from "@/lib/supabase/database.types";
import {saveAppointment} from "./actions";
import {appointmentLabels,appointmentStatuses} from "./schema";
import {santiagoInput} from "@/features/crm/time";
import {Field,fieldClass,primaryClass} from "@/features/crm/ui";
export function AppointmentForm({appointment,contacts,leads,profiles,contactId}:{appointment?:Appointment;contacts:Contact[];leads:Pick<Lead,"id"|"contact_id"|"service">[];profiles:Pick<Profile,"id"|"full_name">[];contactId?:string}) {
  const [message,action,pending]=useActionState(saveAppointment,"");
  const [selected,setSelected]=useState(appointment?.contact_id ?? contactId ?? "");
  const contact=contacts.find(c=>c.id===selected);
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="id" value={appointment?.id ?? ""}/><input type="hidden" name="updated_at" value={appointment?.updated_at ?? ""}/>
    <Field label="Cliente *"><select className={fieldClass} name="contact_id" value={selected} onChange={e=>setSelected(e.target.value)} required><option value="" disabled>Selecciona un contacto</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></Field>
    <Field label="Oportunidad relacionada"><select className={fieldClass} name="lead_id" key={selected} defaultValue={appointment?.contact_id===selected ? appointment.lead_id ?? "" : ""}><option value="">Sin oportunidad vinculada</option>{leads.filter(l=>l.contact_id===selected).map(l=><option value={l.id} key={l.id}>{l.service} · {l.id.slice(0,8)}</option>)}</select></Field>
    <Field label="Tipo"><select className={fieldClass} name="kind" defaultValue={appointment?.kind ?? "visit"}>{Object.entries(appointmentLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
    <Field label="Servicio *"><input className={fieldClass} name="service" defaultValue={appointment?.service ?? ""} required minLength={2} maxLength={160}/></Field>
    <Field label="Inicio (hora de Santiago) *"><input className={fieldClass} name="starts_at" type="datetime-local" defaultValue={santiagoInput(appointment?.starts_at)} required/></Field>
    <Field label="Término (hora de Santiago) *"><input className={fieldClass} name="ends_at" type="datetime-local" defaultValue={santiagoInput(appointment?.ends_at)} required/></Field>
    <Field label="Dirección *"><input key={`address-${selected}`} className={fieldClass} name="address" defaultValue={appointment?.contact_id===selected ? appointment.address : contact?.address ?? ""} required minLength={3} maxLength={240}/></Field>
    <Field label="Comuna *"><input key={`commune-${selected}`} className={fieldClass} name="commune" defaultValue={appointment?.contact_id===selected ? appointment.commune : contact?.commune ?? ""} required minLength={2} maxLength={60}/></Field>
    <Field label="Técnico responsable"><select className={fieldClass} name="technician_id" defaultValue={appointment?.technician_id ?? ""}><option value="">Sin asignar</option>{appointment?.technician_id && !profiles.some(p=>p.id===appointment.technician_id) && <option value={appointment.technician_id}>Técnico inactivo · selecciona otro responsable</option>}{profiles.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
    <Field label="Estado"><select className={fieldClass} name="status" defaultValue={appointment?.status ?? "scheduled"}>{Object.entries(appointmentStatuses).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></Field>
    <Field label="Observaciones" className="sm:col-span-2"><textarea className={fieldClass} name="notes" maxLength={4000} rows={3} defaultValue={appointment?.notes ?? ""}/></Field>
    <Field label="Resultado de la visita" className="sm:col-span-2"><textarea className={fieldClass} name="result" maxLength={4000} rows={3} defaultValue={appointment?.result ?? ""}/></Field>
    <p className="text-sm sm:col-span-2" role="status">{message}</p><Button className={primaryClass} disabled={pending || !contacts.length}>{pending?"Guardando…":"Guardar cita"}</Button>
  </form>;
}
