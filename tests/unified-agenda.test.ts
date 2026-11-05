import { test } from "node:test";
import assert from "node:assert/strict";
import type { Appointment, Installation } from "../src/lib/supabase/database.types";
import { unifiedAgenda } from "../src/features/appointments/unified";

const range = { from: "2026-11-01T03:00:00Z", to: "2026-12-01T03:00:00Z", now: "2026-11-02T12:00:00Z" };
const appointment: Appointment = { id: "visit", contact_id: "contact", lead_id: null, kind: "installation", service: "Fixture", starts_at: "2026-11-03T12:00:00Z", ends_at: "2026-11-03T13:00:00Z", address: "Fixture", commune: "Fixture", technician_id: "old", status: "scheduled", notes: null, result: null, cal_booking_uid: null, created_by: null, created_at: range.now, updated_at: range.now };
const job: Installation = { id: "job", appointment_id: "visit", quote_id: "quote", contact_id: "contact", lead_id: null, service: "Fixture", scheduled_at: "2026-11-04T12:00:00Z", completed_at: null, address: "New address", commune: "Fixture", technician_id: "new", status: "rescheduled", notes: null, technical_data: {}, approved_amount: 0, payment_status: "unpaid", created_by: "admin", created_at: range.now, updated_at: range.now };

test("agenda uses installation date and technician once, with no invented duration", () => {
  const result = unifiedAgenda([appointment], [job, job], range);
  assert.equal(result.length, 1);
  assert.equal(result[0].starts_at, job.scheduled_at);
  assert.equal(result[0].technician_id, "new");
  assert.equal(result[0].ends_at, null);
  assert.equal(result[0].href, "/admin/instalaciones/job");
  assert.equal(result[0].status, "rescheduled");
});

test("moved, unscheduled and cancelled jobs cannot leave a ghost linked appointment", () => {
  assert.equal(unifiedAgenda([appointment], [{ ...job, scheduled_at: "2026-12-02T12:00:00Z" }], range).length, 0);
  assert.equal(unifiedAgenda([appointment], [{ ...job, scheduled_at: null }], range).length, 0);
  assert.equal(unifiedAgenda([appointment], [{ ...job, status: "cancelled" }], { ...range, upcoming: true }).length, 0);
  assert.equal(unifiedAgenda([appointment], [{ ...job, status: "completed" }], { ...range, status: "completed" })[0].status, "completed");
});

test("unlinked appointments remain independent; filters use canonical work fields and inclusive/exclusive bounds", () => {
  const visit = { ...appointment, id: "independent", kind: "visit" as const };
  assert.equal(unifiedAgenda([visit], [job], range).length, 2);
  assert.equal(unifiedAgenda([visit], [job], { ...range, kind: "visits" })[0].id, "independent");
  assert.equal(unifiedAgenda([visit], [job], { ...range, status: "rescheduled" })[0].id, "job");
  assert.equal(unifiedAgenda([], [{ ...job, scheduled_at: range.from }], range).length, 1);
  assert.equal(unifiedAgenda([], [{ ...job, scheduled_at: range.to }], range).length, 0);
});
