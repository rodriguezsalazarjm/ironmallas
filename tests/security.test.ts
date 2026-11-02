import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { leadSchema } from "../src/features/leads/schema";

test("public schema rejects missing consent, invalid service, phone and oversized tracking", () => {
  const valid = { name: "Prueba técnica", phone: "+56900000000", email: "test@example.invalid", service: "invalid", consent: "on", tracking: {} };
  assert.equal(leadSchema.safeParse(valid).success, false);
  const options = leadSchema.shape.service.options;
  const input = { ...valid, service: options[0] };
  assert.equal(leadSchema.safeParse(input).success, true);
  for (const change of [{ consent: undefined }, { phone: "oops" }, { tracking: { utmSource: "x".repeat(201) } }]) {
    assert.equal(leadSchema.safeParse({ ...input, ...change }).success, false);
  }
});

test("migration runs on PostgreSQL; intake, RLS and atomic activity enforce permissions", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated,service_role;
      grant execute on function auth.uid() to authenticated,service_role;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid,bucket_id text);
      alter table storage.objects enable row level security;
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/20261102201241_fase_2a_crm.sql", import.meta.url),"utf8"));
    const admin = "11111111-1111-4111-8111-111111111111";
    const superadmin = "22222222-2222-4222-8222-222222222222";
    const outsider = "33333333-3333-4333-8333-333333333333";
    await db.exec(`insert into auth.users values('${admin}'),('${superadmin}'),('${outsider}');
      insert into public.profiles(id,full_name,role) values('${admin}','Test ADMIN','ADMIN'),('${superadmin}','Test SUPERADMIN','SUPERADMIN');`);
    const payload = { name: "Contacto de prueba", phone: "+56900000000", email: "test@example.invalid", service: "test", consent: "on", tracking: { utmSource: "test" } };
    await db.exec("set role service_role");
    const submit = () => db.query<{id:string|null}>("select public.submit_public_lead($1::jsonb,$2) as id",[JSON.stringify(payload),"a".repeat(64)]);
    const first = (await submit()).rows[0].id;
    assert.ok(first);
    for (let i=0;i<4;i++) assert.ok((await submit()).rows[0].id);
    assert.equal((await submit()).rows[0].id,null);
    await db.exec("reset role");
    assert.equal((await db.query<{n:number}>("select count(*)::int n from public.contacts")).rows[0].n,1);
    assert.equal((await db.query<{n:number}>("select count(*)::int n from public.leads")).rows[0].n,5);
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from public.leads"));
    await assert.rejects(submit());
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[outsider]);
    assert.equal((await db.query("select * from public.leads")).rows.length,0);
    await assert.rejects(db.query("insert into public.profiles(id,full_name,role) values($1,'Attack','SUPERADMIN')",[outsider]));
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
    assert.equal((await db.query("select * from public.leads")).rows.length,5);
    await assert.rejects(db.query("update public.profiles set role='SUPERADMIN' where id=$1",[admin]));
    assert.equal((await db.query("update public.lead_statuses set name='Blocked' returning id")).rows.length,0);
    const status = (await db.query<{id:string}>("select id from public.lead_statuses where key='contacted'")).rows[0].id;
    await db.query("select public.record_lead_activity($1,$2,'note','Test activity',null)",[first,status]);
    assert.equal((await db.query("select * from public.lead_activities")).rows.length,1);
    await assert.rejects(db.query("select public.record_lead_activity($1,$2,'note','',null)",[first,status]));
    assert.equal((await db.query("select * from public.lead_activities")).rows.length,1);
    const won = (await db.query<{id:string}>("select id from public.lead_statuses where key='won'")).rows[0].id;
    await assert.rejects(db.query("select public.record_lead_activity($1,$2,'note','',null)",[first,won]));
    assert.equal((await db.query<{status_id:string}>("select status_id from public.leads where id=$1",[first])).rows[0].status_id,status);
    await assert.rejects(db.query("insert into public.lead_activities(lead_id,type,note,responsible_id) values($1,'note','Spoof',$2)",[first,superadmin]));
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[superadmin]);
    assert.equal((await db.query("update public.lead_statuses set name='Contactado test' where key='contacted' returning id")).rows.length,1);
    await assert.rejects(db.query("update public.lead_statuses set key='other' where key='new'"));
    await assert.rejects(db.query("update public.lead_statuses set active=false where key='new'"));
    await db.exec("reset role");
    await db.query("update public.profiles set active=false where id=$1",[admin]);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
    assert.equal((await db.query("select * from public.leads")).rows.length,0);
    await assert.rejects(db.query("select public.record_lead_activity($1,$2,'note','Blocked',null)",[first,status]));
  } finally { await db.close(); }
});
