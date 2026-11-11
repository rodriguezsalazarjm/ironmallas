"use client";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, FileDown, MessageCircle, Save } from "lucide-react";
import { clp, parseScaledDecimal } from "./calculation";
import { areaLabel, calculateQuick, EXTRA_KINDS, linearLabel, metersToMm, ZONE_KINDS, type ExtraKind, type QuickPayload, type QuickRate, type ZoneKind } from "./quick";
import { saveQuickQuote, type QuickQuoteState } from "./quick-actions";
import { fieldClass, primaryClass, secondaryClass } from "@/features/crm/ui";

export type QuickContact = { id: string; name: string; phone: string | null; whatsapp: string | null; address: string | null; commune: string | null };
type ZoneRow = { key: number; kind: ZoneKind; description: string; width: string; height: string; quantity: string; notes: string };
type ExtraRow = { key: number; kind: ExtraKind; description: string; mode: "rule" | "manual"; rule_id: string; quantity: string; amount: string; source: string };
export type QuickInitial = { quoteId: string; version: number; contactId: string; leadId: string | null; payload: QuickPayload };

const MESH_TYPES = ["Malla de seguridad", "Malla multifilamento", "Otro tipo (detallar en observaciones)"];
const FEATURES = ["Protección de niños", "Protección de mascotas", "Instalación en altura", "Retiro de malla existente"];
const label = "grid min-w-0 gap-1.5 text-sm font-medium";
const mmToMeters = (mm: number) => (mm / 1000).toString().replace(".", ",");
let seq = 0; const nextKey = () => ++seq;
const emptyZone = (): ZoneRow => ({ key: nextKey(), kind: "balcon", description: "", width: "", height: "", quantity: "1", notes: "" });

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-6"><h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-navy-700"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-orange-500 text-sm font-bold text-navy-950">{step}</span>{title}</h2>{children}</section>;
}

export function QuickQuoteEditor({ contacts, rules, taxBps, validityDays, superadmin, services, initial, selectedContact, leadId }: {
  contacts: QuickContact[]; rules: (QuickRate & { material: string | null })[]; taxBps: number | null; validityDays: number | null; superadmin: boolean; services: readonly string[];
  initial?: QuickInitial; selectedContact?: string; leadId?: string;
}) {
  const m2Rules = rules.filter(r => r.unit === "m2" || r.unit === "ml");
  const extraRules = rules.filter(r => r.unit !== "m2" && r.unit !== "ml");
  const pillarRules = extraRules.filter(r => /^pilar/i.test(r.name));
  const p = initial?.payload;
  const [contactMode, setContactMode] = useState<"existing" | "new">(initial || selectedContact || contacts.length ? "existing" : "new");
  const [contactId, setContactId] = useState(initial?.contactId ?? selectedContact ?? "");
  const [filter, setFilter] = useState("");
  const [newContact, setNewContact] = useState({ name: "", whatsapp: "", address: "", commune: "", email: "" });
  const [service, setService] = useState(p?.service ?? services[0] ?? "Mallas de seguridad");
  const [meshType, setMeshType] = useState(p?.mesh_type ?? MESH_TYPES[0]);
  const [features, setFeatures] = useState<string[]>(p?.features ?? []);
  const [workAddress, setWorkAddress] = useState(p?.work_address ?? "");
  const [zones, setZones] = useState<ZoneRow[]>(p ? p.zones.map(z => ({ key: nextKey(), kind: z.kind, description: z.description, width: mmToMeters(z.width_mm), height: mmToMeters(z.height_mm), quantity: String(z.quantity), notes: z.notes })) : [emptyZone()]);
  const [mode, setMode] = useState<"rate" | "manual">(p?.pricing.mode ?? (m2Rules.length || !superadmin ? "rate" : "manual"));
  const [ruleId, setRuleId] = useState(p?.pricing.mode === "rate" ? p.pricing.rule_id : m2Rules[0]?.id ?? "");
  const [manualNet, setManualNet] = useState(p?.pricing.mode === "manual" ? String(p.pricing.manual_net) : "");
  const [manualSource, setManualSource] = useState(p?.pricing.mode === "manual" ? p.pricing.manual_source : "");
  const [extras, setExtras] = useState<ExtraRow[]>(p ? p.extras.map(e => "rule_id" in e
    ? { key: nextKey(), kind: e.kind, description: e.description, mode: "rule", rule_id: e.rule_id, quantity: String(e.quantity_milli / 1000).replace(".", ","), amount: "", source: "" }
    : { key: nextKey(), kind: e.kind, description: e.description, mode: "manual", rule_id: "", quantity: "1", amount: String(e.amount), source: e.source }) : []);
  const [discount, setDiscount] = useState(p ? String(p.discount_bps / 100).replace(".", ",") : "0");
  const [applyTax, setApplyTax] = useState(p?.apply_tax ?? true);
  const [notes, setNotes] = useState(p?.notes ?? "");
  const [definitive, setDefinitive] = useState(p?.definitive ?? false);
  const [state, action, pending] = useActionState<QuickQuoteState, FormData>(saveQuickQuote, { ok: false, message: "" });

  const selected = contacts.find(c => c.id === contactId);
  const visibleContacts = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (q ? contacts.filter(c => `${c.name} ${c.phone ?? ""} ${c.whatsapp ?? ""} ${c.commune ?? ""}`.toLowerCase().includes(q)) : contacts).slice(0, 50);
  }, [contacts, filter]);

  const built = useMemo(() => {
    const errors: string[] = [];
    const zoneValues = zones.map((z, i) => {
      const width = metersToMm(z.width), height = metersToMm(z.height), quantity = Number(z.quantity);
      if (!width || !height) errors.push(`Zona ${i + 1}: ingresa ancho y alto en metros (ej. 1,25).`);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) errors.push(`Zona ${i + 1}: cantidad entera entre 1 y 1000.`);
      return { kind: z.kind, description: z.description.trim(), width_mm: width ?? 0, height_mm: height ?? 0, quantity: Number.isInteger(quantity) ? quantity : 0, notes: z.notes.trim() };
    });
    let discountBps = 0;
    try { discountBps = parseScaledDecimal(discount || "0", 2); if (discountBps > 10000) throw new Error(); } catch { errors.push("Descuento: porcentaje entre 0 y 100."); }
    const extraValues = extras.map((e, i) => {
      if (e.mode === "rule") {
        let qty = 0; try { qty = parseScaledDecimal(e.quantity || "0", 3); } catch { errors.push(`Adicional ${i + 1}: cantidad inválida.`); }
        if (e.kind === "pilar" && qty % 1000 !== 0) errors.push(`Adicional ${i + 1}: los pilares se cotizan por unidades enteras.`);
        return { kind: e.kind, description: e.description.trim(), rule_id: e.rule_id, quantity_milli: qty };
      }
      return { kind: e.kind, description: e.description.trim(), amount: Number(e.amount.replace(/\D/g, "")), source: e.source.trim() };
    });
    const payload = {
      service, mesh_type: meshType, features, work_address: workAddress.trim(), zones: zoneValues,
      pricing: mode === "rate" ? { mode: "rate" as const, rule_id: ruleId } : { mode: "manual" as const, manual_net: Number(manualNet.replace(/\D/g, "")), manual_source: manualSource.trim() },
      extras: extraValues, discount_bps: discountBps, apply_tax: applyTax, notes: notes.trim(), definitive,
    } as QuickPayload;
    let result: ReturnType<typeof calculateQuick> | null = null;
    if (!errors.length && taxBps !== null) {
      try { result = calculateQuick(payload, rules, taxBps, superadmin); }
      catch (error) {
        const message = error instanceof Error ? error.message : "Revisa los datos.";
        errors.push(message.startsWith("[") ? "Completa tarifa o valor neto, procedencia y descripciones de adicionales." : message);
      }
    }
    return { payload, result, errors };
  }, [zones, extras, discount, service, meshType, features, workAddress, mode, ruleId, manualNet, manualSource, applyTax, notes, definitive, rules, taxBps, superadmin]);
  const selectedRule = mode === "rate" ? m2Rules.find(rule => rule.id === ruleId) : undefined;
  const linear = selectedRule?.unit === "ml";

  const contactReady = contactMode === "existing" ? Boolean(contactId) : newContact.name.trim().length >= 2 && newContact.whatsapp.replace(/\D/g, "").length >= 8;
  const canSave = contactReady && built.result && taxBps !== null && !pending;
  const savedId = state.ok ? state.id : initial?.quoteId;

  function submit(formData: FormData) {
    if (!built.result) return;
    formData.set("payload", JSON.stringify({
      contact: contactMode === "existing" ? { mode: "existing", id: contactId } : { mode: "new", ...newContact },
      lead_id: initial?.leadId ?? leadId ?? null, quote_id: state.ok && state.id ? state.id : initial?.quoteId ?? null,
      expected_version: state.ok && state.version ? state.version : initial?.version ?? null, expected_total: built.result.total, quote: built.payload,
    }));
    action(formData);
  }
  const updateZone = (key: number, patch: Partial<ZoneRow>) => setZones(rows => rows.map(r => r.key === key ? { ...r, ...patch } : r));
  const updateExtra = (key: number, patch: Partial<ExtraRow>) => setExtras(rows => rows.map(r => r.key === key ? { ...r, ...patch } : r));
  const r = built.result;
  const whatsappTarget = (selected?.whatsapp || selected?.phone || (contactMode === "new" ? newContact.whatsapp : "") || "").replace(/\D/g, "");

  return <form action={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="grid min-w-0 gap-5">
      <Section step="A" title="Cliente">
        {!initial && <div className="mb-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de cliente">
          {(["existing", "new"] as const).map(m => <button key={m} type="button" role="radio" aria-checked={contactMode === m} onClick={() => setContactMode(m)} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${contactMode === m ? "border-navy-700 bg-navy-700 text-white" : "border-line bg-white text-navy-700"}`}>{m === "existing" ? "Cliente existente" : "Cliente nuevo"}</button>)}
        </div>}
        {contactMode === "existing" ? <div className="grid gap-3">
          {!initial && <label className={label}>Buscar por nombre, teléfono o comuna<input className={fieldClass} value={filter} onChange={e => setFilter(e.target.value)} placeholder="Ej. Pérez o 9 1234" maxLength={80} /></label>}
          <label className={label}>Cliente<select className={fieldClass} value={contactId} onChange={e => setContactId(e.target.value)} disabled={Boolean(initial)} required><option value="">Selecciona…</option>{(selected && !visibleContacts.includes(selected) ? [selected, ...visibleContacts] : visibleContacts).map(c => <option key={c.id} value={c.id}>{c.name}{c.commune ? ` · ${c.commune}` : ""}{c.whatsapp || c.phone ? ` · ${c.whatsapp || c.phone}` : ""}</option>)}</select></label>
          {selected && <p className="text-xs text-ink-soft">{[selected.address, selected.commune].filter(Boolean).join(", ") || "Dirección por confirmar"}</p>}
          {!contacts.length && <p className="text-sm text-ink-soft">Aún no hay clientes. Registra uno nuevo.</p>}
        </div> : <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Nombre *<input className={fieldClass} value={newContact.name} onChange={e => setNewContact(c => ({ ...c, name: e.target.value }))} autoComplete="off" maxLength={80} required /></label>
          <label className={label}>WhatsApp *<input className={fieldClass} value={newContact.whatsapp} onChange={e => setNewContact(c => ({ ...c, whatsapp: e.target.value }))} inputMode="tel" placeholder="+56 9 1234 5678" maxLength={24} required /></label>
          <label className={label}>Dirección<input className={fieldClass} value={newContact.address} onChange={e => setNewContact(c => ({ ...c, address: e.target.value }))} maxLength={240} /></label>
          <label className={label}>Comuna<input className={fieldClass} value={newContact.commune} onChange={e => setNewContact(c => ({ ...c, commune: e.target.value }))} maxLength={60} /></label>
          <label className={`${label} sm:col-span-2`}>Correo (opcional)<input className={fieldClass} type="email" value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))} maxLength={120} /></label>
        </div>}
      </Section>

      <Section step="B" title="Servicio">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Servicio<select className={fieldClass} value={service} onChange={e => setService(e.target.value)}>{services.map(s => <option key={s}>{s}</option>)}</select></label>
          <label className={label}>Tipo de malla / material<select className={fieldClass} value={meshType} onChange={e => setMeshType(e.target.value)}>{[...new Set([...MESH_TYPES, meshType])].map(s => <option key={s}>{s}</option>)}</select></label>
          <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-medium">Características</legend><div className="flex flex-wrap gap-2">{FEATURES.map(f => { const on = features.includes(f); return <button key={f} type="button" aria-pressed={on} onClick={() => setFeatures(list => on ? list.filter(x => x !== f) : [...list, f])} className={`min-h-11 rounded-full border px-4 text-sm ${on ? "border-navy-700 bg-navy-50 font-semibold text-navy-700" : "border-line"}`}>{f}</button>; })}</div></fieldset>
          <label className={`${label} sm:col-span-2`}>Dirección del trabajo (si difiere de la del cliente)<input className={fieldClass} value={workAddress} onChange={e => setWorkAddress(e.target.value)} maxLength={300} placeholder="Calle, número, depto., comuna" /></label>
        </div>
      </Section>

      <Section step="C" title="Medidas">
        <div className="grid gap-4">
          {zones.map((z, i) => { const w = metersToMm(z.width), h = metersToMm(z.height), q = Number(z.quantity); const valid = Boolean(w && h && Number.isInteger(q) && q > 0); const area = valid && w && h ? r?.zones[i]?.area_milli_m2 ?? Math.round((w * h * q) / 1000) : null; const lin = valid && w && h ? (w + h) * q : null;
            return <fieldset key={z.key} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-6">
              <legend className="px-1 text-sm font-semibold text-navy-700">Zona {i + 1}</legend>
              <label className={`${label} col-span-full sm:col-span-2`}>Tipo<select className={fieldClass} value={z.kind} onChange={e => updateZone(z.key, { kind: e.target.value as ZoneKind })}>{Object.entries(ZONE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className={`${label} col-span-full sm:col-span-4`}>Descripción<input className={fieldClass} value={z.description} onChange={e => updateZone(z.key, { description: e.target.value })} maxLength={200} placeholder="Ej. balcón living, piso 8" /></label>
              <div className="col-span-full grid grid-cols-3 gap-2 sm:col-span-4">
                <label className={label}>Ancho (m)<input className={fieldClass} value={z.width} onChange={e => updateZone(z.key, { width: e.target.value })} inputMode="decimal" placeholder="2,40" aria-invalid={Boolean(z.width) && !w} /></label>
                <label className={label}>Alto (m)<input className={fieldClass} value={z.height} onChange={e => updateZone(z.key, { height: e.target.value })} inputMode="decimal" placeholder="1,10" aria-invalid={Boolean(z.height) && !h} /></label>
                <label className={label}>Cantidad<input className={fieldClass} value={z.quantity} onChange={e => updateZone(z.key, { quantity: e.target.value.replace(/\D/g, "") })} inputMode="numeric" /></label>
              </div>
              <div className="col-span-full flex items-end justify-between gap-2 sm:col-span-2"><p className="text-sm">{linear ? <><span className="block text-xs text-ink-soft">Ancho + alto{q > 1 ? ` × ${q}` : ""}</span><strong className="text-lg text-navy-700">{lin !== null ? `${linearLabel(lin)} m` : "—"}</strong></> : <><span className="block text-xs text-ink-soft">Superficie</span><strong className="text-lg text-navy-700">{area !== null ? `${areaLabel(area)} m²` : "—"}</strong></>}</p>{zones.length > 1 && <button type="button" onClick={() => setZones(rows => rows.filter(x => x.key !== z.key))} className="grid size-11 place-items-center rounded-xl border border-line text-red-700" aria-label={`Quitar zona ${i + 1}`}><Trash2 className="size-4" /></button>}</div>
              <label className={`${label} col-span-full`}>Observaciones<input className={fieldClass} value={z.notes} onChange={e => updateZone(z.key, { notes: e.target.value })} maxLength={500} /></label>
            </fieldset>; })}
          <button type="button" onClick={() => setZones(rows => [...rows, emptyZone()])} className={secondaryClass} disabled={zones.length >= 30}><Plus className="size-4" aria-hidden="true" />Agregar zona</button>
          <p className="rounded-xl bg-navy-50 p-3 text-sm text-navy-700">{linear ? <>Metros lineales: <strong>{r ? `${linearLabel(r.linear_mm)} m` : "—"}</strong> · (ancho + alto) × cantidad, sin perímetro completo</> : <>Superficie total: <strong>{r ? `${areaLabel(r.area_milli_m2)} m²` : "—"}</strong> · ancho × alto × cantidad</>}</p>
        </div>
      </Section>

      <Section step="D" title="Valor comercial">
        {taxBps === null && <p className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm">Faltan las condiciones comerciales (IVA, validez, condiciones de pago y datos de la empresa). {superadmin ? <Link href="/admin/tarifario" className="font-semibold underline">Configurarlas</Link> : "Pide a un SUPERADMIN que las configure."}</p>}
        <div className="grid gap-3">
          {superadmin && <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Origen del valor">
            {(["rate", "manual"] as const).map(m => <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${mode === m ? "border-navy-700 bg-navy-700 text-white" : "border-line bg-white text-navy-700"}`}>{m === "rate" ? "Tarifa autorizada" : "Valor neto manual"}</button>)}
          </div>}
          {mode === "rate" ? (m2Rules.length ? <label className={label}>Tarifa autorizada<select className={fieldClass} value={ruleId} onChange={e => setRuleId(e.target.value)}>{m2Rules.map(rule => <option key={rule.id} value={rule.id}>{rule.name} · {clp(rule.unit_price)} neto/{rule.unit === "ml" ? "metro lineal" : "m²"}{rule.min_price ? ` · mín. ${clp(rule.min_price)}` : ""}</option>)}</select>{linear && <span className="text-xs text-ink-soft">Fórmula: (ancho + alto) × {selectedRule ? clp(selectedRule.unit_price) : ""} por zona y cantidad.</span>}</label>
            : <p className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm">No hay tarifas aprobadas. {superadmin ? <>Usa «Valor neto manual» registrando su procedencia, o <Link className="font-semibold underline" href="/admin/tarifario">carga el tarifario</Link>.</> : "Pide a un SUPERADMIN que cargue el tarifario."}</p>)
            : <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>Valor neto (CLP)<input className={fieldClass} value={manualNet} onChange={e => setManualNet(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Ej. 185000" /></label>
              <label className={label}>Procedencia del valor *<input className={fieldClass} value={manualSource} onChange={e => setManualSource(e.target.value)} maxLength={300} placeholder="Ej. precio acordado por Álvaro tras visita" /></label>
            </div>}
          <div className="grid gap-2">
            <p className="text-sm font-medium">Pilares, adicionales y recargos <span className="font-normal text-ink-soft">(se suman al trabajo principal)</span></p>
            {extras.map((e, i) => <fieldset key={e.key} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-6">
              <legend className="sr-only">Adicional {i + 1}</legend>
              <select className={`${fieldClass} sm:col-span-2`} value={e.kind} onChange={ev => updateExtra(e.key, { kind: ev.target.value as ExtraKind })} aria-label="Tipo">{Object.entries(EXTRA_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <input className={`${fieldClass} sm:col-span-4`} value={e.description} onChange={ev => updateExtra(e.key, { description: ev.target.value })} placeholder="Descripción" maxLength={200} aria-label="Descripción" />
              {e.mode === "rule" ? <>
                <select className={`${fieldClass} sm:col-span-4`} value={e.rule_id} onChange={ev => { const chosen = extraRules.find(x => x.id === ev.target.value); updateExtra(e.key, { rule_id: ev.target.value, ...(chosen && (!e.description || extraRules.some(x => x.name === e.description)) ? { description: chosen.name } : {}) }); }} aria-label="Tarifa"><option value="">Tarifa…</option>{extraRules.map(rule => <option key={rule.id} value={rule.id}>{rule.name} · {clp(rule.unit_price)}</option>)}</select>
                <input className={`${fieldClass} sm:col-span-1`} value={e.quantity} onChange={ev => updateExtra(e.key, { quantity: e.kind === "pilar" ? ev.target.value.replace(/\D/g, "") : ev.target.value })} inputMode={e.kind === "pilar" ? "numeric" : "decimal"} aria-label="Cantidad" />
              </> : <>
                <input className={`${fieldClass} sm:col-span-2`} value={e.amount} onChange={ev => updateExtra(e.key, { amount: ev.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Neto CLP" aria-label="Valor neto" />
                <input className={`${fieldClass} sm:col-span-3`} value={e.source} onChange={ev => updateExtra(e.key, { source: ev.target.value })} placeholder="Procedencia" maxLength={200} aria-label="Procedencia" />
              </>}
              <div className="flex items-center justify-between gap-2 sm:col-span-1"><span className="text-sm font-semibold">{r ? clp(r.extras[i] ?? 0) : ""}</span><button type="button" onClick={() => setExtras(rows => rows.filter(x => x.key !== e.key))} className="grid size-11 place-items-center rounded-xl border border-line text-red-700" aria-label={`Quitar adicional ${i + 1}`}><Trash2 className="size-4" /></button></div>
            </fieldset>)}
            <div className="flex flex-wrap gap-2">
              {pillarRules.length > 0 && <button type="button" className={secondaryClass} onClick={() => setExtras(rows => [...rows, { key: nextKey(), kind: "pilar", description: pillarRules[0].name, mode: "rule", rule_id: pillarRules[0].id, quantity: "1", amount: "", source: "" }])}><Plus className="size-4" aria-hidden="true" />Agregar pilares</button>}
              {extraRules.length > pillarRules.length && <button type="button" className={secondaryClass} onClick={() => { const first = extraRules.find(x => !pillarRules.includes(x)); if (first) setExtras(rows => [...rows, { key: nextKey(), kind: "adicional", description: first.name, mode: "rule", rule_id: first.id, quantity: "1", amount: "", source: "" }]); }}><Plus className="size-4" aria-hidden="true" />Adicional del tarifario</button>}
              {superadmin && <button type="button" className={secondaryClass} onClick={() => setExtras(rows => [...rows, { key: nextKey(), kind: "adicional", description: "", mode: "manual", rule_id: "", quantity: "1", amount: "", source: "" }])}><Plus className="size-4" aria-hidden="true" />Adicional con valor manual</button>}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>Descuento (%)<input className={fieldClass} value={discount} onChange={e => setDiscount(e.target.value)} inputMode="decimal" />{r && !superadmin && <span className="text-xs text-ink-soft">Máximo autorizado: {r.max_discount_bps / 100}%</span>}</label>
            {superadmin && <label className="flex min-h-12 items-center gap-3 self-end text-sm"><input type="checkbox" className="size-5" checked={applyTax} onChange={e => setApplyTax(e.target.checked)} />Aplicar IVA ({taxBps !== null ? taxBps / 100 : "—"}%)</label>}
          </div>
          <label className={`flex min-h-12 items-start gap-3 rounded-xl border p-3 text-sm ${definitive ? "border-green-300 bg-green-50" : "border-line"}`}><input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={definitive} onChange={e => setDefinitive(e.target.checked)} /><span><strong>Cotización definitiva</strong> — marcar solo después de la evaluación técnica. Sin marcar, el PDF se emite como «Cotización referencial — sujeta a evaluación técnica».</span></label>
          <label className={label}>Observaciones para el cliente<textarea className={fieldClass} rows={3} value={notes} onChange={e => setNotes(e.target.value)} maxLength={3000} /></label>
        </div>
      </Section>
    </div>

    <aside className="min-w-0 xl:sticky xl:top-6 xl:h-fit">
      <Section step="E" title="Resumen y PDF">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3"><dt>{linear ? "Metros lineales" : "Superficie"}</dt><dd className="font-semibold">{r ? (linear ? `${linearLabel(r.linear_mm)} m` : `${areaLabel(r.area_milli_m2)} m²`) : "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt>{mode === "rate" ? selectedRule?.name ?? "Trabajo principal" : "Valor neto acordado"}{r?.min_applied ? " · mínimo" : ""}</dt><dd>{r ? clp(r.main) : "—"}</dd></div>
          {r && r.surcharge > 0 && <div className="flex justify-between gap-3"><dt>Recargo de tarifa</dt><dd>{clp(r.surcharge)}</dd></div>}
          {r && r.extras.length > 0 && <div className="flex justify-between gap-3"><dt>Pilares y adicionales</dt><dd>{clp(r.extras.reduce((a, b) => a + b, 0))}</dd></div>}
          {r && r.discount > 0 && <div className="flex justify-between gap-3"><dt>Descuento</dt><dd>−{clp(r.discount)}</dd></div>}
          <div className="flex justify-between gap-3 border-t border-line pt-2"><dt>Subtotal neto</dt><dd className="font-semibold">{r ? clp(r.net) : "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt>IVA {r ? `(${r.tax_bps / 100}%)` : ""}</dt><dd>{r ? clp(r.tax) : "—"}</dd></div>
          <div className="flex justify-between gap-3 rounded-xl bg-navy-700 p-3 text-base text-white"><dt className="font-semibold">{r && r.tax > 0 ? "Total IVA incluido" : "Total"}</dt><dd className="font-bold">{r ? clp(r.total) : "—"}</dd></div>
        </dl>
        <p className={`mt-2 rounded-lg px-3 py-2 text-xs font-semibold ${definitive ? "bg-green-50 text-green-800" : "bg-orange-50 text-orange-800"}`}>{definitive ? "Se emitirá como cotización definitiva" : "Se emitirá como cotización referencial"}</p>
        {validityDays && <p className="mt-2 text-xs text-ink-soft">Vigencia: {validityDays} días desde la emisión.</p>}
        {built.errors.length > 0 && <ul className="mt-3 grid gap-1 text-sm text-red-700" role="alert">{[...new Set(built.errors)].slice(0, 4).map(e => <li key={e}>{e}</li>)}</ul>}
        {state.message && <p role="status" aria-live="polite" className={`mt-3 rounded-xl border p-3 text-sm ${state.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{state.message}{state.warning && <span className="mt-1 block font-semibold">{state.warning}</span>}</p>}
        <div className="mt-4 grid gap-2">
          <button type="submit" disabled={!canSave} className={`${primaryClass} min-h-12 w-full`}><Save className="size-4" aria-hidden="true" />{pending ? "Guardando…" : savedId ? "Guardar nueva versión" : "Guardar borrador"}</button>
          {savedId && <>
            <a className={`${secondaryClass} min-h-12 w-full gap-2`} href={`/admin/cotizaciones/${savedId}/pdf?version=${state.version ?? initial?.version}&download=1`}><FileDown className="size-4" aria-hidden="true" />Descargar PDF</a>
            <a className={`${secondaryClass} min-h-12 w-full`} href={`/admin/cotizaciones/${savedId}/pdf?version=${state.version ?? initial?.version}`} target="_blank" rel="noopener noreferrer">Ver PDF</a>
            <Link className={`${secondaryClass} min-h-12 w-full gap-2`} href={`/admin/cotizaciones/${savedId}`}><MessageCircle className="size-4" aria-hidden="true" />WhatsApp, versiones y estado</Link>
          </>}
          {!savedId && whatsappTarget.length >= 8 && <p className="text-xs text-ink-soft">Guarda el borrador para generar el PDF y el mensaje de WhatsApp.</p>}
        </div>
        <p className="mt-4 text-xs text-ink-soft">Guardar no marca la cotización como enviada. El envío se registra manualmente en su ficha.</p>
      </Section>
    </aside>
  </form>;
}
