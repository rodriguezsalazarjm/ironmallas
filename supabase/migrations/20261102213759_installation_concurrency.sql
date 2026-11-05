-- Local preparation only. Apply remotely only after comparing the authorized project.
begin;

-- now() is transaction-scoped; a version must change even for two writes in one transaction.
create function private.touch_installation_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end $$;
revoke all on function private.touch_installation_version() from public, anon, authenticated;
drop trigger touch_updated on public.installations;
create trigger touch_updated before update on public.installations
for each row execute function private.touch_installation_version();

-- Lock and compare in the same transaction as the existing checked status transition.
create function public.set_installation_status_checked(
  p_id uuid, p_status text, p_notes text, p_expected_updated_at timestamptz
) returns void language plpgsql security invoker set search_path = '' as $$
declare current_updated_at timestamptz;
begin
  if not private.is_admin() then raise exception 'Forbidden'; end if;
  select updated_at into strict current_updated_at
    from public.installations where id = p_id for update;
  if p_expected_updated_at is null or current_updated_at is distinct from p_expected_updated_at then
    raise exception 'Installation changed; reload before saving' using errcode = '40001';
  end if;
  perform public.set_installation_status(p_id, p_status, p_notes);
end $$;
revoke all on function public.set_installation_status_checked(uuid,text,text,timestamptz)
  from public, anon;
grant execute on function public.set_installation_status_checked(uuid,text,text,timestamptz)
  to authenticated;
commit;
