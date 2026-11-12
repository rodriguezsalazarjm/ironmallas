import Link from "next/link";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { siteContent } from "@/content/site";
import { commercialSchema } from "@/features/pricing/schema";
import { quickPayloadSchema, type QuickPayload } from "@/features/quotes/quick";
import { QuickQuoteEditor, type QuickInitial } from "@/features/quotes/quick-editor";
import { PageHeading, secondaryClass } from "@/features/crm/ui";

export default async function NewQuotePage({ searchParams }: PageProps<"/admin/cotizaciones/nueva">) {
  const { db, profile } = await requireAdmin();
  const params = await searchParams;
  const contact = z.uuid().safeParse(params.contact), lead = z.uuid().safeParse(params.lead), quoteParam = z.uuid().safeParse(params.quote), appointmentParam = z.uuid().safeParse(params.appointment);
  const [contacts, rules, commercial] = await Promise.all([
    db.from("contacts").select("id,name,phone,whatsapp,address,commune").order("created_at", { ascending: false }).limit(500),
    db.from("pricing_rules").select("id,name,unit,unit_price,min_price,surcharge_bps,max_discount_bps,active,material").eq("active", true).order("name"),
    db.from("settings").select("value").eq("key", "commercial").maybeSingle(),
  ]);
  if (contacts.error || rules.error || commercial.error) throw new Error("No fue posible cargar el cotizador.");
  const settings = commercialSchema.safeParse(commercial.data?.value);

  let initial: QuickInitial | undefined; let editError = "";
  if (quoteParam.success) {
    const quote = await db.from("quotes").select("id,contact_id,lead_id,current_version,status,details,appointment_id").eq("id", quoteParam.data).maybeSingle();
    const details = quote.data?.details as Record<string, unknown> | undefined;
    const payload = details?.kind === "quick" ? quickPayloadSchema.safeParse({
      service: details.service, mesh_type: details.mesh_type ?? "", features: details.features ?? [], work_address: details.work_address ?? "",
      zones: details.zones, pricing: details.pricing, extras: details.extras ?? [], discount_bps: 0, apply_tax: details.apply_tax ?? true, notes: "", definitive: details.definitive === true,
      tax_exemption: (details.tax_treatment as { key?: string } | undefined)?.key ?? "", appointment_id: quote.data?.appointment_id ?? null,
    }) : null;
    if (quote.error || !quote.data) editError = "No se encontró la cotización a editar.";
    else if (!["draft", "sent"].includes(quote.data.status)) editError = "Solo se editan borradores o cotizaciones enviadas.";
    else if (!payload?.success) editError = "Esta cotización fue creada con el editor anterior; edítala desde su ficha.";
    else {
      const full = await db.from("quotes").select("discount_bps,notes").eq("id", quote.data.id).single();
      initial = { quoteId: quote.data.id, version: quote.data.current_version, contactId: quote.data.contact_id, leadId: quote.data.lead_id,
        payload: { ...payload.data, discount_bps: full.data?.discount_bps ?? 0, notes: full.data?.notes ?? "" } };
      const contactOfQuote = quote.data.contact_id;
      if (!contacts.data.some(c => c.id === contactOfQuote)) {
        const extra = await db.from("contacts").select("id,name,phone,whatsapp,address,commune").eq("id", contactOfQuote).maybeSingle();
        if (extra.data) contacts.data.unshift(extra.data);
      }
    }
  }
  // Visita técnica → cotización: reutiliza medidas, pilares y dirección registradas en la ficha técnica.
  let draft: QuickPayload | undefined; let draftNote = "";
  if (!initial && appointmentParam.success) {
    const [visit, assessment] = await Promise.all([
      db.from("appointments").select("id,contact_id,service,address,commune,building,unit,floor").eq("id", appointmentParam.data).maybeSingle(),
      db.from("technical_assessments").select("*").eq("appointment_id", appointmentParam.data).maybeSingle(),
    ]);
    if (!visit.data || (contact.success && visit.data.contact_id !== contact.data)) draftNote = "La visita indicada no corresponde a este cliente.";
    else if (!assessment.data || !(assessment.data.zones as unknown[]).length) draftNote = "La visita aún no tiene medidas en su ficha técnica: ingrésalas aquí o complétalas primero en la ficha.";
    else {
      const a = assessment.data;
      const pillar = (size: string) => rules.data.find(r => r.unit === "unit" && /^pilar/i.test(r.name) && r.name.includes(size));
      const extras = ([["2,00", a.pillars_200], ["2,40", a.pillars_240]] as const).flatMap(([size, n]) => { const rule = pillar(size); return n > 0 && rule ? [{ kind: "pilar" as const, description: rule.name, rule_id: rule.id, quantity_milli: n * 1000 }] : []; });
      const linear = rules.data.find(r => r.unit === "ml") ?? rules.data.find(r => r.unit === "m2");
      const where = [visit.data.address, visit.data.building, visit.data.unit && `Depto ${visit.data.unit}`, visit.data.floor && `Piso ${visit.data.floor}`, visit.data.commune].filter(Boolean).join(", ");
      draft = { service: siteContent.quoteForm.serviceOptions[0] ?? visit.data.service, mesh_type: a.mesh_type ?? "", features: [], work_address: where.slice(0, 300), zones: a.zones,
        pricing: { mode: "rate", rule_id: linear?.id ?? "" }, extras, discount_bps: 0, apply_tax: true, tax_exemption: "", notes: a.recommendations?.slice(0, 3000) ?? "", definitive: false, appointment_id: visit.data.id };
      draftNote = `Medidas cargadas desde la visita técnica (${a.zones.length} zonas${extras.length ? `, ${extras.reduce((t, e) => t + e.quantity_milli / 1000, 0)} pilares` : ""}). Revisa antes de guardar.`;
    }
  }
  if (contact.success && !contacts.data.some(c => c.id === contact.data)) {
    const extra = await db.from("contacts").select("id,name,phone,whatsapp,address,commune").eq("id", contact.data).maybeSingle();
    if (extra.data) contacts.data.unshift(extra.data);
  }

  return <>
    <PageHeading title={initial ? "Editar cotización" : "Generar cotización"} description="Cliente, medidas y valor en una sola pantalla. El cálculo se muestra al instante y se vuelve a comprobar al guardar.">
      <Link className={secondaryClass} href="/admin/cotizaciones">Historial de cotizaciones</Link>
    </PageHeading>
    {draftNote && <p role="status" className="mb-5 rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm">{draftNote}</p>}
    {editError && <p role="alert" className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm">{editError}</p>}
    <QuickQuoteEditor key={initial?.quoteId ?? draft?.appointment_id ?? "new"} exemptions={settings.success ? settings.data.tax_exemptions : []} draft={draft} appointmentId={draft?.appointment_id ?? undefined} contacts={contacts.data} rules={rules.data} taxBps={settings.success ? settings.data.tax_bps : null} validityDays={settings.success ? settings.data.validity_days : null}
      superadmin={profile.role === "SUPERADMIN"} services={siteContent.quoteForm.serviceOptions} initial={initial}
      selectedContact={contact.success ? contact.data : undefined} leadId={lead.success ? lead.data : undefined} />
  </>;
}
