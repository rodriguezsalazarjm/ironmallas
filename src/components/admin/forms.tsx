"use client";
import { useActionState, useState } from "react";
import { login, recordActivity, saveStatus } from "@/features/admin/actions";
import type { LeadStatus, Lead } from "@/lib/supabase/database.types";
import {santiagoInput} from "@/features/crm/time";

export const input = "w-full rounded-xl border border-line bg-white p-3 text-ink focus:outline-2 focus:outline-navy-700";
const button = "rounded-xl bg-navy-700 px-5 py-3 font-semibold text-white disabled:opacity-50";
function Feedback({ message }: { message: string }) { return <p role="status" className="text-sm text-navy-700">{message}</p>; }
export function LoginForm({ disabled }: { disabled: boolean }) {
  const [message, action, pending] = useActionState(login, "");
  const [showPassword, setShowPassword] = useState(false);
  return <form action={action} className="grid gap-5">
    <label className="grid gap-2">Correo<input className={input} type="email" name="email" autoComplete="username" required maxLength={120} disabled={disabled} /></label>
    <div className="grid gap-2"><label htmlFor="login-password">Contraseña</label>
      <div className="relative"><input id="login-password" className={`${input} pr-24`} type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" required maxLength={256} disabled={disabled} />
        <button type="button" onClick={() => setShowPassword(v => !v)} aria-controls="login-password" aria-pressed={showPassword} disabled={disabled} className="absolute inset-y-1 right-1 rounded-lg px-3 text-sm font-semibold text-navy-700 hover:bg-navy-700/10 focus:outline-2 focus:outline-navy-700 disabled:opacity-50">{showPassword ? "Ocultar" : "Mostrar"}</button></div></div>
    <Feedback message={message} /><button className={button} disabled={disabled || pending}>{pending ? "Ingresando…" : "Ingresar"}</button>
  </form>;
}
export function ActivityForm({ lead, statuses }: { lead: Lead; statuses: LeadStatus[] }) {
  const [message, action, pending] = useActionState(recordActivity, "");
  return <form action={action} className="grid gap-4">
    <input type="hidden" name="id" value={lead.id} />
    <label className="grid gap-2">Estado<select name="status" defaultValue={lead.status_id} className={input}>{statuses.filter(s => s.active || s.id === lead.status_id).map(s => <option key={s.id} value={s.id} disabled={!s.active}>{s.name}</option>)}</select></label>
    <label className="grid gap-2">Tipo de actividad<select name="type" className={input}><option value="note">Nota</option><option value="call">Llamada</option><option value="whatsapp">WhatsApp</option><option value="email">Correo</option></select></label>
    <label className="grid gap-2">Nota<textarea name="note" className={input} required maxLength={2000} rows={4} /></label>
    <label className="grid gap-2">Próximo seguimiento (hora de Santiago)<input name="followUp" type="datetime-local" className={input} defaultValue={santiagoInput(lead.next_follow_up_at)} /></label>
    <Feedback message={message} /><button className={button} disabled={pending}>{pending ? "Guardando…" : "Guardar actividad"}</button>
  </form>;
}
export function StatusForm({ status }: { status: LeadStatus }) {
  const [message, action, pending] = useActionState(saveStatus, "");
  return <form action={action} className="grid gap-3 rounded-xl border border-line p-4">
    <input type="hidden" name="id" value={status.id} />
    <label className="grid gap-1">Nombre<input className={input} name="name" defaultValue={status.name} required maxLength={80} /></label>
    <label className="grid gap-1">Orden<input className={input} name="position" type="number" min={0} max={1000} defaultValue={status.position} required /></label>
    <label><input type="checkbox" name="active" defaultChecked={status.active} /> Activo</label>
    <label><input type="checkbox" name="final" defaultChecked={status.is_final} /> Estado final</label>
    <Feedback message={message} /><button className={button} disabled={pending}>Guardar estado</button>
  </form>;
}
