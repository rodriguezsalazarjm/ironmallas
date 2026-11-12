/**
 * Agenda operativa, fichas técnicas, sincronización Cal.com, avisos y cotizador flexible.
 * SIMULADO: PostgreSQL embebido (PGlite) con las migraciones reales, y dobles de prueba para Cal.com/fetch.
 * No contacta Supabase remoto, Cal.com ni Resend.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { ADMIN, OUTSIDER, SUPERADMIN, asService, asUser, platformDatabase } from "./platform-fixture";
import type { PGlite } from "@electric-sql/pglite";
import { normalizeCalEvent } from "../src/features/integrations/cal";
import { planAppointmentChange } from "../src/features/appointments/sync-plan";
import { unifiedAgenda } from "../src/features/appointments/unified";
import { agendaNoticeVerdict } from "../src/features/notifications/agenda-rules";
import { renderAgendaEmail } from "../src/features/notifications/agenda-templates";
import { buildBusyCalendar } from "../src/features/agenda/ics";
import { viewRange, dayStart } from "../src/features/agenda/calendar";
import { calculateQuick, type QuickPayload, type QuickRate } from "../src/features/quotes/quick";
import type { Appointment, Installation } from "../src/lib/supabase/database.types";

const H = 3600000;
const iso = (ms: number) => new Date(ms).toISOString();
const sync = (db: PGlite, key: string, type: string, payload: unknown) => db.query<{ id: string | null }>("select public.sync_cal_booking($1,$2,$3) id", [key, type, JSON.stringify(payload)]);
const notices = (db: PGlite, id: string) => db.query<{ kind: string; status: string; send_after: string; event_starts_at: string; payload: { audience: string; near: boolean } }>("select kind,status,send_after,event_starts_at,payload from public.notifications where entity_id=$1 order by created_at,kind", [id]);
async function contact(db: PGlite, email = "cliente@example.invalid") {
  return (await db.query<{ id: string }>("insert into public.contacts(name,phone,email,source) values('Cliente agenda','56911110000',$1,'admin') returning id", [email])).rows[0].id;
}

test("visita desde la web (webhook Cal.com): contacto, oportunidad, visita, origen y avisos sin duplicar", async () => {
  const db = await platformDatabase();
  try {
    await asService(db);
    const start = Math.floor((Date.now() + 72 * H) / 60000) * 60000; // Cal.com envía minutos exactos
    const raw = JSON.stringify({ triggerEvent: "BOOKING_CREATED", createdAt: iso(Date.now()), payload: { uid: "web-1", startTime: iso(start), endTime: iso(start + H), title: "Visita técnica", attendees: [{ name: "Persona Web", email: "Web@Example.invalid" }],
      responses: { whatsapp: { label: "WhatsApp", value: "+56 9 1234 5678" }, direccion: { value: "Av. Prueba 123" }, comuna: { value: "Ñuñoa" }, tipo_zona: { value: "Balcón" }, detalle: { value: "Piso 8" }, consentimiento: { value: true } } } });
    const event = normalizeCalEvent(raw);
    assert.equal(event.payload.contact?.commune, "Ñuñoa"); assert.equal(event.payload.zone_kind, "balcon"); assert.equal(event.payload.consent, true); assert.equal(event.payload.contact?.phone, "56912345678");
    const id = (await sync(db, event.eventKey, event.type, event.payload)).rows[0].id!;
    assert.equal((await sync(db, event.eventKey, event.type, event.payload)).rows[0].id, id, "reintento idempotente");
    const appt = (await db.query<{ source: string; cal_sync_status: string; zone_kind: string; commune: string; lead_id: string }>("select * from public.appointments where id=$1", [id])).rows[0];
    assert.equal(appt.source, "cal_booking"); assert.equal(appt.cal_sync_status, "synced"); assert.equal(appt.zone_kind, "balcon"); assert.equal(appt.commune, "Ñuñoa");
    const lead = (await db.query<{ source: string; external_id: string; legal_basis: string }>("select source,external_id,legal_basis from public.leads where id=$1", [appt.lead_id])).rows[0];
    assert.deepEqual(lead, { source: "CAL_BOOKING", external_id: "web-1", legal_basis: "consent" });
    assert.equal((await db.query<{ consent: boolean }>("select consent from public.contacts where email='web@example.invalid'")).rows[0].consent, true);
    assert.equal((await db.query<{ status: string }>("select status from public.notifications where kind='lead_created'")).rows[0].status, "cancelled", "sin alerta duplicada de oportunidad");
    const queued = (await notices(db, id)).rows;
    assert.deepEqual(queued.map(n => `${n.kind}:${n.payload.audience}`).sort(), ["agenda_reminder:admin", "agenda_reminder:client", "agenda_scheduled:admin", "agenda_scheduled:client"]);
    assert.equal(Date.parse(queued.find(n => n.kind === "agenda_reminder")!.send_after), start - 24 * H, "recordatorio exactamente 24 h antes");
    assert.equal((await db.query("select * from public.appointments")).rows.length, 1);
  } finally { await db.close(); }
});

test("creación manual, conflicto de horario por técnico con margen, y reprogramación/cancelación con avisos", async () => {
  const db = await platformDatabase();
  try {
    await asUser(db, ADMIN);
    const c = await contact(db);
    const start = Date.now() + 5 * 24 * H;
    const insert = (s: number, e: number, tech: string | null = ADMIN) => db.query<{ id: string }>("insert into public.appointments(contact_id,kind,service,starts_at,ends_at,address,commune,technician_id,source,created_by) values($1,'visit','Visita',$2,$3,'Calle 1','Providencia',$4,'admin',$5) returning id", [c, iso(s), iso(e), tech, ADMIN]);
    const first = (await insert(start, start + H)).rows[0].id;
    await assert.rejects(insert(start + 30 * 60000, start + 2 * H), (e: { code?: string }) => e.code === "23P01", "solapamiento bloqueado");
    await insert(start + 30 * 60000, start + 2 * H, SUPERADMIN); // otro técnico: permitido
    await insert(start + H, start + 2 * H); // contiguo sin margen: permitido
    await asUser(db, SUPERADMIN);
    await db.query("update public.settings set value=value||'{\"buffer_minutes\":30}' where key='agenda'");
    await asUser(db, ADMIN);
    await assert.rejects(insert(start + 2 * H + 10 * 60000, start + 3 * H), (e: { code?: string }) => e.code === "23P01", "margen operativo de 30 min");
    // Reprogramar: invalida avisos anteriores y crea nuevos.
    await db.query("update public.appointments set starts_at=$2,ends_at=$3,status='rescheduled' where id=$1", [first, iso(start - 24 * H), iso(start - 23 * H)]);
    let rows = (await notices(db, first)).rows;
    assert.ok(rows.filter(n => n.kind === "agenda_reminder" && Date.parse(n.event_starts_at) === start).every(n => n.status === "cancelled"));
    assert.equal(rows.filter(n => n.kind === "agenda_rescheduled").length, 2);
    assert.equal(rows.filter(n => n.kind === "agenda_reminder" && n.status === "pending").length, 2);
    // Cancelar: no quedan recordatorios pendientes; se avisa la cancelación.
    await db.query("update public.appointments set status='cancelled' where id=$1", [first]);
    rows = (await notices(db, first)).rows;
    assert.equal(rows.filter(n => n.kind !== "agenda_cancelled" && n.status === "pending").length, 0);
    assert.equal(rows.filter(n => n.kind === "agenda_cancelled" && n.status === "pending").length, 2);
    // Un evento cancelado deja de bloquear al técnico.
    await insert(start - 24 * H, start - 23 * H);
  } finally { await db.close(); }
});

test("aviso cercano: menos de 24 h no genera recordatorio retrospectivo y marca el aviso como cercano", async () => {
  const db = await platformDatabase();
  try {
    await asUser(db, ADMIN);
    const c = await contact(db);
    const s = Date.now() + 5 * H;
    const id = (await db.query<{ id: string }>("insert into public.appointments(contact_id,kind,service,starts_at,ends_at,address,commune,created_by) values($1,'visit','Visita',$2,$3,'Calle','Comuna',$4) returning id", [c, iso(s), iso(s + H), ADMIN])).rows[0].id;
    const rows = (await notices(db, id)).rows;
    assert.equal(rows.filter(n => n.kind === "agenda_reminder").length, 0);
    assert.ok(rows.filter(n => n.kind === "agenda_scheduled").every(n => n.payload.near === true));
  } finally { await db.close(); }
});

test("Cal.com → Supabase: reprogramación por UID y eventos fuera de orden no reviven una cancelación", async () => {
  const db = await platformDatabase();
  try {
    await asService(db);
    const s = Date.now() + 96 * H;
    const base = { uid: "cal-a", contact: { name: "Cliente Cal", email: "cal@example.invalid", commune: "Las Condes" }, starts_at: iso(s), ends_at: iso(s + H), occurred_at: iso(Date.now() - 3000) };
    const id = (await sync(db, "e1", "BOOKING_CREATED", base)).rows[0].id!;
    await db.query("update public.appointments set attendance_status='confirmed',attendance_confirmed_at=now() where id=$1", [id]);
    await sync(db, "e2", "BOOKING_RESCHEDULED", { ...base, uid: "cal-b", old_uid: "cal-a", starts_at: iso(s + 24 * H), ends_at: iso(s + 25 * H), occurred_at: iso(Date.now() - 2000) });
    const moved = (await db.query<{ cal_booking_uid: string; status: string; attendance_status: string; starts_at: Date }>("select * from public.appointments where id=$1", [id])).rows[0];
    assert.equal(moved.cal_booking_uid, "cal-b"); assert.equal(moved.status, "rescheduled"); assert.equal(moved.attendance_status, "pending", "la confirmación no se arrastra a un horario nuevo");
    await sync(db, "e3", "BOOKING_CANCELLED", { uid: "cal-b", occurred_at: iso(Date.now() - 1000) });
    await sync(db, "e-late", "BOOKING_RESCHEDULED", { ...base, uid: "cal-b", old_uid: "cal-a", starts_at: iso(s + 48 * H), ends_at: iso(s + 49 * H), occurred_at: iso(Date.now() - 2500) });
    assert.equal((await db.query<{ status: string }>("select status from public.appointments where id=$1", [id])).rows[0].status, "cancelled");
    assert.equal((await db.query("select * from public.appointments")).rows.length, 1, "sin duplicados");
    assert.equal((await db.query("select * from public.notifications where entity_id=$1 and kind='agenda_reminder' and status='pending'", [id])).rows.length, 0, "sin recordatorios tras cancelar");
  } finally { await db.close(); }
});

test("Supabase → Cal.com: plan de sincronización conserva el estado si la API no está disponible", () => {
  const current = { starts_at: "2026-12-01T13:00:00.000Z", ends_at: "2026-12-01T14:00:00.000Z", status: "scheduled" as const, cal_booking_uid: "uid-1" };
  const moved = { starts_at: "2026-12-02T13:00:00.000Z", ends_at: "2026-12-02T15:00:00.000Z", status: "scheduled" as const };
  const plan = planAppointmentChange(current, moved, true);
  assert.ok(plan.ok && plan.cal === "reschedule");
  if (plan.ok) { assert.equal(plan.next.status, "rescheduled"); assert.equal(plan.next.ends_at, "2026-12-02T14:00:00.000Z", "Cal.com fija la duración"); }
  assert.equal(planAppointmentChange(current, moved, false).ok, false, "sin CAL_API_KEY no se cambia la agenda");
  const cancel = planAppointmentChange(current, { ...current, status: "cancelled" }, true);
  assert.ok(cancel.ok && cancel.cal === "cancel");
  assert.equal(planAppointmentChange({ ...current, status: "cancelled" }, { ...current, status: "scheduled" }, true).ok, false);
  const local = planAppointmentChange({ ...current, cal_booking_uid: null }, moved, false);
  assert.ok(local.ok && local.cal === "none" && local.next.ends_at === moved.ends_at);
});

test("cliente Cal.com API v2: cabecera de versión, UID nuevo y error nunca reportado como éxito", async () => {
  const { createCalClient, CAL_API_VERSION } = await import("../src/features/integrations/cal-client");
  const calApiClient = (f: typeof fetch) => createCalClient("cal_test_fixture", "https://cal.invalid/v2/", f);
  const calls: { url: string; init: RequestInit }[] = [];
  const ok = calApiClient((async (url: string, init: RequestInit) => { calls.push({ url, init }); return Response.json({ status: "success", data: { uid: "nuevo-uid" } }); }) as unknown as typeof fetch);
  const result = await ok.reschedule("viejo uid", "2026-12-02T13:00:00.000Z", "Cambio");
  assert.deepEqual(result, { ok: true, uid: "nuevo-uid" });
  assert.equal(calls[0].url, "https://cal.invalid/v2/bookings/viejo%20uid/reschedule");
  assert.equal((calls[0].init.headers as Record<string, string>)["cal-api-version"], CAL_API_VERSION);
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { start: "2026-12-02T13:00:00.000Z", reschedulingReason: "Cambio" });
  const failing = calApiClient((async () => Response.json({ status: "error" }, { status: 400 })) as unknown as typeof fetch);
  assert.equal((await failing.cancel("x", "motivo")).ok, false);
  const down = calApiClient((async () => { throw new Error("red"); }) as unknown as typeof fetch);
  assert.equal((await down.cancel("x", "motivo")).ok, false);
});

test("ficha técnica: zonas validadas, RLS y cadena visita → cotización → instalación sin duplicar la visita", async () => {
  const db = await platformDatabase();
  try {
    await asUser(db, SUPERADMIN);
    await db.query("insert into public.settings(key,value,updated_by) values('commercial',$1,$2)", [JSON.stringify({ tax_bps: 1900, validity_days: 15, payment_terms: "Pago sintético", company: { name: "Empresa prueba", phone: "+56 9 0000 0000", email: "p@example.invalid", address: "Dirección" } }), SUPERADMIN]);
    const rule = (await db.query<{ id: string }>("select id from public.pricing_rules where name='Recambio'")).rows[0].id;
    await asUser(db, ADMIN);
    const c = await contact(db);
    const s = Date.now() + 10 * 24 * H;
    const visit = (await db.query<{ id: string }>("insert into public.appointments(contact_id,kind,service,starts_at,ends_at,address,commune,created_by) values($1,'visit','Visita',$2,$3,'Calle','Comuna',$4) returning id", [c, iso(s), iso(s + H), ADMIN])).rows[0].id;
    const zones = [{ kind: "ventana", description: "Living", width_mm: 1200, height_mm: 1000, quantity: 2, notes: "" }];
    await assert.rejects(db.query("insert into public.technical_assessments(appointment_id,zones,created_by) values($1,$2,$3)", [visit, JSON.stringify([{ ...zones[0], width_mm: 0 }]), ADMIN]));
    await db.query("insert into public.technical_assessments(appointment_id,zones,pillars_200,anchoring,created_by) values($1,$2,1,'Hormigón',$3)", [visit, JSON.stringify(zones), ADMIN]);
    await asUser(db, OUTSIDER);
    assert.equal((await db.query("select * from public.technical_assessments")).rows.length, 0, "RLS: sin perfil activo no hay acceso");
    await assert.rejects(db.query("insert into public.technical_assessments(appointment_id,zones,created_by) values($1,'[]',$2)", [visit, OUTSIDER]));
    await asUser(db, ADMIN);
    const payload = { service: "Mallas", mesh_type: "", features: [], work_address: "Calle", zones, pricing: { mode: "rate", rule_id: rule }, extras: [], discount_bps: 0, apply_tax: true, notes: "", definitive: true, appointment_id: visit };
    const quote = (await db.query<{ id: string }>("select public.save_quick_quote($1,null,null,null,$2) id", [c, JSON.stringify(payload)])).rows[0].id;
    const saved = (await db.query<{ appointment_id: string; net: number }>("select appointment_id,net from public.quotes where id=$1", [quote])).rows[0];
    assert.equal(saved.appointment_id, visit); assert.equal(saved.net, (1200 + 1000) * 2 * 5000 / 1000, "(ancho + alto) × cantidad × tarifa");
    const other = await contact(db, "otro@example.invalid");
    await assert.rejects(db.query("select public.save_quick_quote($1,null,null,null,$2)", [other, JSON.stringify(payload)]), "la visita debe ser del mismo cliente");
    await db.query("select public.set_quote_status($1,'sent',1)", [quote]); await db.query("select public.set_quote_status($1,'accepted',1)", [quote]);
    const job = (await db.query<{ id: string }>("select public.create_installation($1,$2,$3,'Calle','Comuna','{}',null) id", [quote, iso(s + 7 * 24 * H), ADMIN])).rows[0].id;
    const a = (await db.query<Appointment>("select * from public.appointments")).rows, j = (await db.query<Installation>("select * from public.installations")).rows;
    const toIso = <T extends object>(r: T) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])) as T;
    const agenda = unifiedAgenda(a.map(toIso), j.map(toIso), { from: iso(Date.now()), to: iso(s + 30 * 24 * H), now: iso(Date.now()) });
    assert.deepEqual(agenda.map(e => e.source).sort(), ["appointment", "installation"], "visita e instalación visibles, cada una una vez");
    assert.equal(agenda.find(e => e.source === "installation")!.quote_id, quote);
    assert.equal(agenda.find(e => e.source === "installation")!.ends_at, null, "sin duración inventada");
    assert.equal((await db.query("select * from public.notifications where entity_id=$1 and kind='agenda_scheduled'", [job])).rows.length, 2, "aviso de instalación programada a cliente y administrador");
  } finally { await db.close(); }
});

test("confirmación de asistencia: enlace temporal con hash, sin efectos en GET y obsoleto tras reprogramar", async () => {
  const db = await platformDatabase();
  try {
    await asUser(db, ADMIN);
    const c = await contact(db);
    const s = Date.now() + 30 * H;
    const id = (await db.query<{ id: string }>("insert into public.appointments(contact_id,kind,service,starts_at,ends_at,address,commune,created_by) values($1,'visit','Visita',$2,$3,'Calle','Comuna',$4) returning id", [c, iso(s), iso(s + H), ADMIN])).rows[0].id;
    await assert.rejects(db.query("select public.confirm_attendance($1,true)", ["a".repeat(64)]), "solo service_role");
    await asService(db);
    const hash = createHash("sha256").update("token-de-prueba").digest("hex");
    await db.query("select public.issue_attendance_token($1,'appointment',$2,$3,$3)", [hash, id, iso(s)]);
    const check = async (commit: boolean) => (await db.query<{ r: { state: string } }>("select public.confirm_attendance($1,$2) r", [hash, commit])).rows[0].r.state;
    assert.equal(await check(false), "ready");
    assert.equal((await db.query<{ attendance_status: string }>("select attendance_status from public.appointments where id=$1", [id])).rows[0].attendance_status, "pending", "GET no confirma");
    assert.equal(await check(true), "confirmed");
    assert.equal((await db.query<{ attendance_status: string }>("select attendance_status from public.appointments where id=$1", [id])).rows[0].attendance_status, "confirmed");
    await asUser(db, ADMIN);
    await db.query("update public.appointments set starts_at=$2,ends_at=$3 where id=$1", [id, iso(s + 2 * H), iso(s + 3 * H)]);
    await asService(db);
    assert.equal(await check(true), "outdated");
    assert.equal((await db.query<{ r: { state: string } }>("select public.confirm_attendance($1,true) r", ["f".repeat(64)])).rows[0].r.state, "invalid");
  } finally { await db.close(); }
});

test("envío: nunca recordatorios de eventos cancelados, reprogramados o pasados; Cal.com conserva su confirmación", () => {
  const now = Date.parse("2026-12-01T12:00:00Z");
  const n = { kind: "agenda_reminder", event_starts_at: "2026-12-02T13:00:00Z" };
  const event = { startsAt: "2026-12-02T13:00:00Z", status: "scheduled", source: "admin" };
  const opts = { clientEmail: "c@example.invalid", audience: "client" as const, calSendsClientConfirmation: true };
  assert.deepEqual(agendaNoticeVerdict(n, event, now, opts), { send: true });
  assert.equal(agendaNoticeVerdict(n, { ...event, status: "cancelled" }, now, opts).send, false);
  assert.equal(agendaNoticeVerdict(n, { ...event, startsAt: "2026-12-03T13:00:00Z" }, now, opts).send, false);
  assert.equal(agendaNoticeVerdict(n, event, Date.parse("2026-12-02T14:00:00Z"), opts).send, false);
  assert.equal(agendaNoticeVerdict(n, event, now, { ...opts, clientEmail: null }).send, false);
  assert.equal(agendaNoticeVerdict({ kind: "agenda_scheduled", event_starts_at: event.startsAt }, { ...event, source: "cal_booking" }, now, opts).send, false);
  assert.equal(agendaNoticeVerdict({ kind: "agenda_scheduled", event_starts_at: event.startsAt }, { ...event, source: "cal_booking" }, now, { ...opts, audience: "admin" }).send, true);
  assert.equal(agendaNoticeVerdict({ kind: "agenda_cancelled", event_starts_at: event.startsAt }, { ...event, status: "cancelled" }, now, opts).send, true);
  const mail = renderAgendaEmail({ kind: "agenda_scheduled", audience: "client", entity: "appointment", clientName: "Ana Pérez", startsAt: "2026-12-02T13:00:00Z", durationMinutes: 60, address: "Calle 1", commune: "Providencia", service: "Visita", company: { name: "Iron Mallas", phone: "+56 9", email: "c@x" }, confirmUrl: "https://x/confirmar/t", near: true });
  assert.equal(mail.subject, "Tu visita técnica con Iron Mallas está agendada");
  assert.match(mail.text, /10:00/, "hora de Santiago (UTC-3 en verano)"); assert.match(mail.text, /Calle 1, Providencia/); assert.match(mail.text, /menos de 24 horas/);
});

test("precio excepcional por metro lineal, historial de tarifas e IVA solo con exención justificada", async () => {
  const db = await platformDatabase();
  try {
    await asUser(db, SUPERADMIN);
    const exemption = { key: "exenta_prueba", label: "Operación exenta de prueba", kind: "exempt", legal_basis: "Fundamento sintético validado por el contador" };
    await db.query("insert into public.settings(key,value,updated_by) values('commercial',$1,$2)", [JSON.stringify({ tax_bps: 1900, validity_days: 15, payment_terms: "Pago", company: { name: "Empresa", phone: "+56 9 0000 0000", email: "p@example.invalid", address: "Dir" }, tax_exemptions: [exemption] }), SUPERADMIN]);
    const rules = (await db.query<QuickRate>("select id,name,unit,unit_price,min_price,surcharge_bps,max_discount_bps,active from public.pricing_rules")).rows;
    const angles = rules.find(r => r.name === "Instalación solo ángulos")!;
    const c = await contact(db);
    const zones = [{ kind: "balcon" as const, description: "", width_mm: 3000, height_mm: 1500, quantity: 1, notes: "" }];
    const custom: QuickPayload = { service: "Mallas", mesh_type: "", features: [], work_address: "", zones, pricing: { mode: "custom_rate", rule_id: angles.id, unit_price: 5500, reason: "Volumen edificio completo" }, extras: [], discount_bps: 0, apply_tax: true, notes: "", definitive: false };
    const preview = calculateQuick(custom, rules, 1900, true);
    assert.equal(preview.main, 4500 * 5500 / 1000);
    assert.throws(() => calculateQuick(custom, rules, 1900, false), /SUPERADMIN/);
    const id = (await db.query<{ id: string }>("select public.save_quick_quote($1,null,null,null,$2) id", [c, JSON.stringify(custom)])).rows[0].id;
    const q = (await db.query<{ net: number; total: number; details: { pricing: { unit_price: number; base_unit_price: number; reason: string } } }>("select net,total,details from public.quotes where id=$1", [id])).rows[0];
    assert.equal(q.net, preview.net); assert.equal(q.total, preview.total);
    assert.deepEqual([q.details.pricing.unit_price, q.details.pricing.base_unit_price, q.details.pricing.reason], [5500, 6000, "Volumen edificio completo"]);
    assert.equal((await db.query<{ unit_price: number }>("select unit_price from public.pricing_rules where id=$1", [angles.id])).rows[0].unit_price, 6000, "la tarifa general no cambia");
    const snapshot = (await db.query<{ s: { quote: { details: { pricing: { unit_price: number } } } } }>("select snapshot s from public.quote_versions where quote_id=$1", [id])).rows[0].s;
    assert.equal(snapshot.quote.details.pricing.unit_price, 5500, "la versión conserva el precio aplicado");
    // Historial de tarifas generales.
    await db.query("update public.pricing_rules set unit_price=6500 where id=$1", [angles.id]);
    const audit = (await db.query<{ changes: { before: { unit_price: number }; after: { unit_price: number } } }>("select changes from public.audit_logs where entity='pricing_rules' and entity_id=$1 and action='update'", [angles.id])).rows[0];
    assert.deepEqual([audit.changes.before.unit_price, audit.changes.after.unit_price], [6000, 6500]);
    // IVA: sin exención configurada se rechaza incluso a SUPERADMIN; con exención queda justificada.
    const rate: QuickPayload = { ...custom, pricing: { mode: "rate", rule_id: angles.id } };
    await assert.rejects(db.query("select public.save_quick_quote($1,null,null,null,$2)", [c, JSON.stringify({ ...rate, apply_tax: false })]));
    await assert.rejects(db.query("select public.save_quick_quote($1,null,null,null,$2)", [c, JSON.stringify({ ...rate, apply_tax: false, tax_exemption: "empresa_pide_factura" })]));
    assert.throws(() => calculateQuick({ ...rate, apply_tax: false }, rules, 1900, true, [exemption as never]), /justificación/);
    const exempt = (await db.query<{ id: string }>("select public.save_quick_quote($1,null,null,null,$2) id", [c, JSON.stringify({ ...rate, apply_tax: false, tax_exemption: "exenta_prueba" })])).rows[0].id;
    const ex = (await db.query<{ tax: number; tax_bps: number; details: { tax_treatment: { kind: string; legal_basis: string } } }>("select tax,tax_bps,details from public.quotes where id=$1", [exempt])).rows[0];
    assert.equal(ex.tax, 0); assert.equal(ex.details.tax_treatment.kind, "exempt"); assert.match(ex.details.tax_treatment.legal_basis, /contador/);
    const affected = (await db.query<{ details: { tax_treatment: { kind: string } }; tax: number; net: number }>("select details,tax,net from public.quotes where id=$1", [id])).rows[0];
    assert.equal(affected.details.tax_treatment.kind, "affected"); assert.equal(affected.tax, Math.round(affected.net * 0.19));
    await asUser(db, ADMIN);
    await assert.rejects(db.query("select public.save_quick_quote($1,null,null,null,$2)", [c, JSON.stringify(custom)]), "ADMIN no aplica precio excepcional");
    await assert.rejects(db.query("select public.save_quick_quote($1,null,null,null,$2)", [c, JSON.stringify({ ...rate, apply_tax: false, tax_exemption: "exenta_prueba" })]), "ADMIN no omite IVA");
    // Aceptada: inmutable.
    await db.query("select public.set_quote_status($1,'sent',1)", [id]); await db.query("select public.set_quote_status($1,'accepted',1)", [id]);
    await assert.rejects(db.query("select public.save_quick_quote($1,null,$2,1,$3)", [c, id, JSON.stringify(rate)]));
  } finally { await db.close(); }
});

test("agenda: rangos de vistas en Santiago (cambio de horario a medianoche) y feed ICS sin datos personales", () => {
  assert.equal(dayStart("2026-09-06"), "2026-09-06T04:00:00.000Z", "00:00 no existe: el día comienza a la 01:00 (UTC-3)");
  const week = viewRange("week", "2026-11-11");
  assert.equal(week.first, "2026-11-09"); assert.equal(week.last, "2026-11-15");
  const month = viewRange("month", "2026-11-11");
  assert.equal(month.first, "2026-10-26"); assert.equal(month.last, "2026-12-06");
  const year = viewRange("year", "2026-03-01");
  assert.equal(year.first, "2026-01-01"); assert.equal(year.last, "2026-12-31");
  const ics = buildBusyCalendar([{ uid: "a-1", starts_at: "2026-12-02T13:00:00.000Z", ends_at: "2026-12-02T14:00:00.000Z" }, { uid: "i-2", starts_at: "2026-12-03T13:00:00.000Z", ends_at: null }], 15, new Date("2026-12-01T00:00:00Z"));
  assert.match(ics, /DTSTART:20261202T124500Z\r\nDTEND:20261202T141500Z/);
  assert.match(ics, /DTEND:20261204T031500Z/, "sin duración: bloquea hasta fin del día local + margen");
  assert.doesNotMatch(ics, /Cliente|Calle|@example/);
  assert.equal((ics.match(/SUMMARY:Ocupado/g) ?? []).length, 2);
});

test("firma Cal.com se verifica sobre los bytes originales con respuestas de reserva", async () => {
  const { verifyCalSignature } = await import("../src/features/integrations/cal");
  const raw = JSON.stringify({ triggerEvent: "BOOKING_CREATED", createdAt: "2026-11-02T12:00:00Z", payload: { uid: "x", startTime: "2026-11-04T12:00:00Z", endTime: "2026-11-04T13:00:00Z", attendees: [{ name: "A", email: "a@example.invalid" }], responses: { tipo_zona: "Logia" } } });
  const secret = "s".repeat(40);
  assert.equal(verifyCalSignature(raw, createHmac("sha256", secret).update(raw).digest("hex"), secret), true);
  assert.equal(verifyCalSignature(raw + " ", createHmac("sha256", secret).update(raw).digest("hex"), secret), false);
  assert.equal(normalizeCalEvent(raw).payload.zone_kind, "logia");
});
