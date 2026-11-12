// Cola de notificaciones: concurrencia, lease, reintentos controlados y ventana de idempotencia.
// SIMULADO: almacén en memoria con semántica compare-and-set equivalente a un UPDATE ... WHERE de PostgREST.
import { test } from "node:test";
import assert from "node:assert/strict";
import { claimNotification, releaseFailure } from "../src/features/notifications/queue";
import type { Json } from "../src/lib/supabase/database.types";
import { LEASE_MS, MAX_ATTEMPTS, providerVerdict, retryAllowed, retryDelayMs } from "../src/features/notifications/queue-rules";

type Row = { id: string; status: string; attempts: number; send_after: string; created_at: string; payload: { [k: string]: Json | undefined }; last_error: string | null };

function fakeDb(rows: Row[]) {
  return {
    from() {
      let patch: Partial<Row> = {};
      const filters: ((r: Row) => boolean)[] = [];
      const run = () => {
        // Single-threaded JS: filter + write happen atomically, like one SQL UPDATE.
        const hit = rows.filter(r => filters.every(f => f(r)));
        hit.forEach(r => Object.assign(r, structuredClone(patch)));
        return hit;
      };
      const q = {
        update(v: Partial<Row>) { patch = v; return q; },
        eq(k: keyof Row, v: unknown) { filters.push(r => r[k] === v); return q; },
        in(k: keyof Row, v: unknown[]) { filters.push(r => v.includes(r[k])); return q; },
        lte(k: keyof Row, v: string) { filters.push(r => Date.parse(String(r[k])) <= Date.parse(v)); return q; },
        select() { return q; },
        async maybeSingle() { const hit = run(); return { data: hit[0] ? { id: hit[0].id } : null, error: null }; },
        then(ok: (v: unknown) => void) { run(); ok({ error: null }); },
      };
      return q;
    },
  } as never;
}

const T0 = Date.parse("2026-12-01T12:00:00Z");
const row = (over: Partial<Row> = {}): Row => ({ id: "n1", status: "pending", attempts: 0, send_after: new Date(T0 - 1000).toISOString(), created_at: new Date(T0 - 60_000).toISOString(), payload: { dedupe_key: "k" }, last_error: null, ...over });

test("dos ejecuciones concurrentes: solo una reclama el aviso y el lease lo oculta hasta resolverse", async () => {
  const r = row(); const db = fakeDb([r]);
  const snapshot = { ...r };
  const [a, b] = await Promise.all([claimNotification(db, snapshot, T0), claimNotification(db, snapshot, T0)]);
  assert.equal([a, b].filter(Boolean).length, 1);
  assert.equal(r.attempts, 1);
  assert.equal(Date.parse(r.send_after), T0 + LEASE_MS);
  assert.equal(r.payload.dedupe_key, "k");
  assert.equal(r.payload.first_attempt_at, new Date(T0).toISOString());
  // Una ejecución posterior (antes de vencer el lease) que lee la fila ya reclamada tampoco la toma.
  assert.equal(await claimNotification(db, { ...r }, T0 + 60_000), false);
});

test("un error del proveedor deja el aviso en reintento controlado con espera creciente; al tercero va a revisión", async () => {
  const r = row({ attempts: 1, payload: { first_attempt_at: new Date(T0).toISOString() } }); const db = fakeDb([r]);
  await releaseFailure(db, "n1", 1, "rechazado");
  assert.equal(r.status, "failed"); assert.equal(r.attempts, 1);
  assert.ok(Date.parse(r.send_after) - Date.now() > retryDelayMs(1) - 5000);
  assert.equal(await claimNotification(db, { ...r }, Date.now()), false, "no se reintenta antes de la espera");
  await releaseFailure(db, "n1", MAX_ATTEMPTS, "rechazado");
  assert.match(r.last_error!, /Reintentos agotados/);
  assert.deepEqual([retryDelayMs(1), retryDelayMs(2)], [300_000, 900_000]);
});

test("409 de idempotencia: revisión manual, nunca reenvío ni 'enviado'", async () => {
  assert.equal(providerVerdict(null), "ok");
  assert.equal(providerVerdict({ name: "validation_error" }), "retry");
  assert.equal(providerVerdict({ name: "network_error" }), "retry");
  assert.equal(providerVerdict({ name: "invalid_idempotent_request" }), "review");
  const r = row({ attempts: 1 }); const db = fakeDb([r]);
  await releaseFailure(db, "n1", 1, "x", true);
  assert.equal(r.status, "failed"); assert.equal(r.attempts, MAX_ATTEMPTS); assert.match(r.last_error!, /Revisión manual/);
});

test("ventana de idempotencia: se mide desde el primer intento, no desde la creación del aviso", async () => {
  const created = new Date(T0 - 3 * 86_400_000).toISOString(); // recordatorio encolado 3 días antes
  assert.equal(retryAllowed({ attempts: 1, created_at: created, payload: { first_attempt_at: new Date(T0 - 3_600_000).toISOString() } }, T0), true);
  assert.equal(retryAllowed({ attempts: 1, created_at: created, payload: { first_attempt_at: new Date(T0 - 24 * 3_600_000).toISOString() } }, T0), false);
  const r = row({ attempts: 1, status: "failed", created_at: created, payload: { first_attempt_at: new Date(T0 - 24 * 3_600_000).toISOString() } }); const db = fakeDb([r]);
  assert.equal(await claimNotification(db, { ...r }, T0), false);
  assert.equal(r.attempts, MAX_ATTEMPTS); assert.match(r.last_error!, /23 h/);
});
