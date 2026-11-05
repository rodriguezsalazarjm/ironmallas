-- Execute only through the project-scoped MCP for kqdcotpfzluxkqdkgyts.
-- Metadata only; do not select customer records, tokens or identities.
begin read only;

select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','private','auth','storage') and c.relkind='r'
order by 1,2;

select table_schema, table_name, column_name, data_type, udt_name,
       is_nullable, column_default, character_maximum_length
from information_schema.columns
where table_schema in ('public','private') order by table_schema,table_name,ordinal_position;

select n.nspname as schema_name, c.relname as table_name, con.conname,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con join pg_class c on c.oid=con.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','private') order by 1,2,3;

select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','private','storage') order by 1,2,3;

select table_schema,table_name,grantee,privilege_type
from information_schema.table_privileges
where table_schema in ('public','private','storage')
and grantee in ('anon','authenticated','service_role') order by 1,2,3,4;

select table_schema,table_name,column_name,grantee,privilege_type
from information_schema.column_privileges
where table_schema='public' and grantee in ('anon','authenticated') order by 1,2,3,4,5;

select n.nspname as schema_name,p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as result,p.prosecdef as security_definer,
       p.proconfig,p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') order by 1,2,3;

select schemaname,tablename,indexname,indexdef from pg_indexes
where schemaname in ('public','private') order by 1,2,3;

select event_object_schema,event_object_table,trigger_name,action_timing,
       event_manipulation,action_statement
from information_schema.triggers where event_object_schema in ('public','private')
order by 1,2,3,5;

-- Schema existence does not prove Auth signup/SMTP/redirect configuration or a working login.
select to_regclass('auth.users') is not null as auth_users_present,
       to_regclass('auth.sessions') is not null as auth_sessions_present,
       to_regclass('storage.buckets') is not null as storage_buckets_present;
select id,public,file_size_limit,allowed_mime_types from storage.buckets
where id in ('admin-documents','public-media') order by id;
commit;

-- Obtain migration history with MCP list_migrations. Inspect Auth settings via authorized
-- read-only management access/dashboard; never export auth.users or secret config values.
-- Obtain security/performance reports with MCP get_advisors, not arbitrary SQL functions.
