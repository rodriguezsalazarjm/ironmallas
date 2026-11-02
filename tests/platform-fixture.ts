import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
export const ADMIN = "11111111-1111-4111-8111-111111111111";
export const SUPERADMIN = "22222222-2222-4222-8222-222222222222";
export const OUTSIDER = "33333333-3333-4333-8333-333333333333";
export async function platformDatabase(seedProfiles=true) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,service_role;
    grant execute on function auth.uid() to authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon;
    grant select,insert,update on storage.objects to authenticated;
    grant select on storage.objects to anon;
  `);
  const folder = new URL("../supabase/migrations/",import.meta.url);
  for (const name of (await readdir(folder)).filter(n => n.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(name,folder),"utf8"));
  await db.exec(`insert into auth.users values('${ADMIN}'),('${SUPERADMIN}'),('${OUTSIDER}');`);
  if(seedProfiles) await db.exec(`insert into public.profiles(id,full_name,role) values('${ADMIN}','Fixture ADMIN','ADMIN'),('${SUPERADMIN}','Fixture SUPERADMIN','SUPERADMIN');`);
  return db;
}
export async function asUser(db:PGlite,id:string) { await db.exec("reset role;set role authenticated"); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); }
export async function asService(db:PGlite) { await db.exec("reset role;set role service_role"); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
