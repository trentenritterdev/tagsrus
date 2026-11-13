-- Return only whether the signed-in owner's profile has an access PIN.
-- Never expose the stored PIN hash to the browser.
create or replace function public.has_tagsrus_access_pin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and private_pin_hash is not null
  );
$$;

revoke all on function public.has_tagsrus_access_pin() from public, anon;
grant execute on function public.has_tagsrus_access_pin() to authenticated;
