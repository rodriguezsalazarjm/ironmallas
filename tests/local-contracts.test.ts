import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { reviewSchema } from "../src/features/reviews/schema";
import { privacyRequestSchema } from "../src/features/privacy/schema";
import { installationEditSchema } from "../src/features/installations/schema";
import { platformDatabase, asUser, ADMIN, OUTSIDER } from "./platform-fixture";

const contactId = "66666666-6666-4666-8666-666666666666";
const review = { id: "", contact_id: "", display_name: "A".repeat(100), rating: 5,
  original_text: "a".repeat(3000), presentation_text: "b".repeat(3000), photos: "" };

test("review and privacy forms accept SQL boundaries and reject one character beyond", () => {
  assert.equal(reviewSchema.safeParse(review).success, true);
  for (const key of ["display_name", "original_text", "presentation_text"] as const) {
    assert.equal(reviewSchema.safeParse({ ...review, [key]: review[key] + "x" }).success, false, key);
  }
  const request = { contact_id: contactId, type: "export", reason: "a".repeat(3000) };
  assert.equal(privacyRequestSchema.safeParse(request).success, true);
  assert.equal(privacyRequestSchema.safeParse({ ...request, reason: request.reason + "x" }).success, false);
  const edit = { id: contactId, updated_at: "2026-11-02T12:00:00.123456+00:00" };
  assert.equal(installationEditSchema.parse(edit).updated_at, edit.updated_at);
  assert.equal(installationEditSchema.safeParse({ id: contactId }).success, false);
  assert.equal(installationEditSchema.safeParse({ ...edit, updated_at: "invalid" }).success, false);
});

test("local Auth and canonical URL use the same port", async () => {
  const example = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  const variable = (key: string) => example.match(new RegExp(`^${key}=(.*)$`, "m"))![1].trim();
  assert.equal(variable("AUTH_SITE_URL"), variable("NEXT_PUBLIC_SITE_URL"));
  assert.equal(new URL(variable("AUTH_SITE_URL")).port, "3000");
});

test("SQL accepts shared review/privacy boundaries and rejects oversized values", async () => {
  const db = await platformDatabase();
  try {
    await asUser(db, ADMIN);
    await db.query("insert into public.contacts(id,name,email,phone) values($1,'Fixture','fixture@example.invalid','56900000000')", [contactId]);
    const insert = "insert into public.reviews(display_name,rating,original_text,presentation_text,created_by) values($1,5,$2,$3,$4)";
    await db.query(insert, [review.display_name, review.original_text, review.presentation_text, ADMIN]);
    for (const values of [
      [review.display_name + "x", review.original_text, review.presentation_text, ADMIN],
      [review.display_name, review.original_text + "x", review.presentation_text, ADMIN],
      [review.display_name, review.original_text, review.presentation_text + "x", ADMIN],
    ]) await assert.rejects(db.query(insert, values));
    const request = "insert into public.privacy_requests(contact_id,type,reason,created_by) values($1,'export',$2,$3)";
    await db.query(request, [contactId, "a".repeat(3000), ADMIN]);
    await assert.rejects(db.query(request, [contactId, "a".repeat(3001), ADMIN]));
  } finally { await db.close(); }
});

test("stale installation schedule, technical data and status cannot overwrite newer edits", async () => {
  const db = await platformDatabase();
  try {
    // Fixtures only: owner creates minimum relational records, then all edits run as ADMIN.
    await db.query("insert into public.contacts(id,name,email,phone) values($1,'Fixture','fixture@example.invalid','56900000000')", [contactId]);
    const quote = (await db.query<{id:string}>("insert into public.quotes(contact_id,tax_bps,valid_until,payment_terms,created_by) values($1,0,current_date,'Fixture',$2) returning id", [contactId, ADMIN])).rows[0].id;
    const job = (await db.query<{id:string}>("insert into public.installations(contact_id,quote_id,service,address,commune,approved_amount,created_by) values($1,$2,'Fixture','Fixture address','Fixture commune',1000,$3) returning id", [contactId, quote, ADMIN])).rows[0].id;
    await asUser(db, ADMIN);
    const version = async () => (await db.query<{v:string}>("select updated_at::text v from public.installations where id=$1", [job])).rows[0].v;
    const original = await version();
    // Repeat within one transaction to ensure timestamps cannot accidentally remain equal.
    await db.exec("begin");
    await db.query("update public.installations set scheduled_at=now()+interval '1 day',notes='First editor' where id=$1 and updated_at=$2", [job, original]);
    const changed = await version();
    assert.notEqual(changed, original);
    const staleSchedule = await db.query("update public.installations set scheduled_at=now()+interval '2 days',notes='Stale editor' where id=$1 and updated_at=$2 returning id", [job, original]);
    const staleTechnical = await db.query("update public.installations set technical_data='{\"material\":\"stale\"}' where id=$1 and updated_at=$2 returning id", [job, original]);
    assert.equal(staleSchedule.rows.length, 0);
    assert.equal(staleTechnical.rows.length, 0);
    await db.exec("commit");
    await assert.rejects(db.query("select public.set_installation_status_checked($1,'in_progress','Stale editor',$2)", [job, original]), /Installation changed/);
    await assert.rejects(db.query("select public.set_installation_status_checked($1,'in_progress','Missing version',null)", [job]), /Installation changed/);
    await db.query("select public.set_installation_status_checked($1,'in_progress','Current editor',$2)", [job, changed]);
    const latest = await version();
    assert.notEqual(latest, changed);
    await assert.rejects(db.query("select public.set_installation_status_checked($1,'cancelled','Old status editor',$2)", [job, changed]), /Installation changed/);
    const state = (await db.query<{status:string;notes:string;technical_data:unknown}>("select status,notes,technical_data from public.installations where id=$1", [job])).rows[0];
    assert.deepEqual(state, { status: "in_progress", notes: "Current editor", technical_data: {} });
    await asUser(db, OUTSIDER);
    await assert.rejects(db.query("select public.set_installation_status_checked($1,'cancelled','Unauthorized',$2)", [job, latest]), /Forbidden/);
    await db.exec("reset role;set role anon");
    await assert.rejects(db.query("select public.set_installation_status_checked($1,'cancelled','Anonymous',$2)", [job, latest]), /permission denied/);
  } finally { await db.close(); }
});
