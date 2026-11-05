"use client";
import { useActionState, useState } from "react";
import { createWhatsappLead, saveNextAction } from "./whatsapp-actions";
import { fieldClass, primaryClass } from "@/features/crm/ui";
import type { LeadStatus } from "@/lib/supabase/database.types";

const label = "grid min-w-0 gap-1.5 text-sm font-medium";

export function WhatsappLeadForm({ services, statuses }: { services: readonly string[]; statuses: Pick<LeadStatus, "id" | "name" | "key">[] }) {
  const [message, action, pending] = useActionState(createWhatsappLead, "");
  const [phone, setPhone] = useState("");
  const digits = phone.replace(/\D/g, "");
  const chat = digits.length >= 8 ? `https://wa.me/${digits.length === 9 && digits.startsWith("9") ? `56${digits}` : digits}` : null;
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <fieldset className="col-span-full grid grid-cols-2 gap-2"><legend className="mb-2 text-sm font-medium">Origen</legend>
      <label className="flex min-h-12 items-center gap-2 rounded-xl border border-line px-3 text-sm has-[:checked]:border-green-700 has-[:checked]:bg-green-50"><input type="radio" name="source" value="WHATSAPP_MANUAL" defaultChecked />WhatsApp</label>
      <label className="flex min-h-12 items-center gap-2 rounded-xl border border-line px-3 text-sm has-[:checked]:border-navy-700 has-[:checked]:bg-navy-50"><input type="radio" name="source" value="CONTACTO_MANUAL" />Llamada / en persona</label>
    </fieldset>
    <label className={label}>Nombre *<input className={fieldClass} name="name" required minLength={2} maxLength={80} autoComplete="off" /></label>
    <label className={label}>Teléfono *<input className={fieldClass} name="phone" required inputMode="tel" placeholder="+56 9 1234 5678" maxLength={24} value={phone} onChange={e => setPhone(e.target.value)} /></label>
    <label className={label}>Servicio *<select className={fieldClass} name="service" defaultValue={services[0]}>{services.map(s => <option key={s}>{s}</option>)}</select></label>
    <label className={label}>Comuna<input className={fieldClass} name="commune" maxLength={60} /></label>
    <label className={`${label} col-span-full`}>Nota<textarea className={fieldClass} name="note" rows={3} maxLength={1500} placeholder="Lo que pidió el cliente, medidas aproximadas, horario…" /></label>
    <label className={label}>Estado inicial<select className={fieldClass} name="status" defaultValue={statuses.find(s => s.key === "new")?.id}>{statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className={label}>Próxima acción<input className={fieldClass} name="next_action" maxLength={300} placeholder="Ej. enviar cotización" /></label>
    <label className={`${label} col-span-full sm:col-span-1`}>Seguimiento (hora de Santiago)<input className={fieldClass} type="datetime-local" name="follow_up" /></label>
    {message && <p role="alert" className="col-span-full rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{message}</p>}
    <div className="col-span-full flex flex-wrap gap-2">
      <button className={`${primaryClass} min-h-12 flex-1`} disabled={pending}>{pending ? "Guardando…" : "Guardar oportunidad"}</button>
      {chat && <a href={chat} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-green-600 px-4 text-sm font-semibold text-white">Abrir chat</a>}
    </div>
    <p className="col-span-full text-xs text-ink-soft">Base de tratamiento registrada: solicitud precontractual iniciada por el cliente. Si el número ya existe, se reutiliza su ficha y no se duplica la oportunidad de las últimas 72 horas.</p>
  </form>;
}

export function NextActionForm({ id, value }: { id: string; value: string | null }) {
  const [message, action, pending] = useActionState(saveNextAction, "");
  return <form action={action} className="grid gap-2"><input type="hidden" name="id" value={id} />
    <label className={label}>Próxima acción<input className={fieldClass} name="next_action" defaultValue={value ?? ""} maxLength={300} /></label>
    <button className={primaryClass} disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>{message && <p role="status" className="text-sm text-navy-700">{message}</p>}</form>;
}
