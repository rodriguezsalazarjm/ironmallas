import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/admin/action-form";
import { createInstallation } from "@/features/installations/actions";
import { Field, Panel, PageHeading, fieldClass } from "@/features/crm/ui";
export default async function NewInstallation() {
  const {db}=await requireAdmin();
  const [quotes,users,contacts,jobs]=await Promise.all([db.from("quotes").select("id,number,contact_id,total").eq("status","accepted").limit(500),db.from("profiles").select("id,full_name").eq("active",true),db.from("contacts").select("id,name").limit(1000),db.from("installations").select("quote_id").limit(1000)]);
  if(quotes.error||users.error||contacts.error||jobs.error)throw new Error("No se pudieron cargar las cotizaciones.");
  const available=quotes.data.filter(q=>!jobs.data.some(j=>j.quote_id===q.id));
  return <><PageHeading title="Nueva instalación" description="Selecciona una cotización aceptada. El importe aprobado se conserva automáticamente."/><Link href="/admin/instalaciones" className="mb-5 inline-block underline">← Volver</Link><Panel title="Ficha del trabajo">{!available.length?<p>No hay cotizaciones aceptadas disponibles. <Link href="/admin/cotizaciones" className="underline">Ir a cotizaciones</Link></p>:<ActionForm action={createInstallation} label="Crear instalación">
    <Field label="Cotización aprobada"><select name="quote" className={fieldClass} required>{available.map(q=><option key={q.id} value={q.id}>#{q.number} · {contacts.data.find(c=>c.id===q.contact_id)?.name} · ${q.total.toLocaleString("es-CL")}</option>)}</select></Field>
    <div className="grid gap-4 md:grid-cols-2"><Field label="Dirección"><input name="address" className={fieldClass} required maxLength={240}/></Field><Field label="Comuna"><input name="commune" className={fieldClass} required maxLength={60}/></Field><Field label="Fecha y hora (Santiago, opcional)"><input type="datetime-local" name="scheduled" className={fieldClass}/></Field><Field label="Técnico"><select name="technician" className={fieldClass}><option value="">Sin asignar</option>{users.data.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select></Field></div>
    <div className="grid gap-4 md:grid-cols-2">{[["type","Tipo de material / servicio"],["color","Color"],["anchors","Material de anclaje"],["structure","Tipo de estructura"],["dimensions","Dimensiones y superficie"],["location","Ubicación de instalación"]].map(([name,label])=><Field key={name} label={label}><input className={fieldClass} name={name} maxLength={name==="dimensions"?600:160}/></Field>)}</div><Field label="Observaciones técnicas"><textarea name="notes" rows={4} className={fieldClass} maxLength={4000}/></Field>
  </ActionForm>}</Panel></>;
}
