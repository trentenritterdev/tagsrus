-- Admin grants live in the database, never in editable user metadata.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to authenticated;
drop policy if exists user_roles_read_self on public.user_roles;
create policy user_roles_read_self on public.user_roles for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.is_tagsrus_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  );
$$;
revoke all on function public.is_tagsrus_admin() from public, anon;
grant execute on function public.is_tagsrus_admin() to authenticated;

alter table private.tag_claim_codes
  add column if not exists code_suffix text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create or replace function public.admin_create_tag_codes(p_codes jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  item jsonb;
  raw_code text;
  clean_code text;
  tag_label text;
  seen_codes text[] := array[]::text[];
  inserted_count integer := 0;
begin
  if current_user_id is null or not public.is_tagsrus_admin() then
    raise exception 'Only a TagsRUs admin can add tag codes.';
  end if;
  if p_codes is null or jsonb_typeof(p_codes) <> 'array' or jsonb_array_length(p_codes) < 1 or jsonb_array_length(p_codes) > 100 then
    raise exception 'Add between 1 and 100 tag codes at a time.';
  end if;

  for item in select value from jsonb_array_elements(p_codes) as codes(value) loop
    raw_code := coalesce(item ->> 'code', '');
    clean_code := regexp_replace(upper(raw_code), '[^A-Z0-9]', '', 'g');
    tag_label := trim(coalesce(item ->> 'name', 'Emergency Contact Tag'));
    if char_length(clean_code) < 6 or char_length(clean_code) > 64 then
      raise exception 'A tag code must contain between 6 and 64 letters or numbers.';
    end if;
    if char_length(tag_label) < 1 or char_length(tag_label) > 120 then
      raise exception 'A tag name must contain between 1 and 120 characters.';
    end if;
    if clean_code = any(seen_codes) or exists (
      select 1 from private.tag_claim_codes c where c.code_hash = extensions.digest(convert_to(clean_code, 'UTF8'), 'sha256')
    ) then
      raise exception 'A tag code in this batch already exists. Generate a new batch and try again.';
    end if;

    insert into private.tag_claim_codes (code_hash, code_suffix, tag_name, created_by)
      values (extensions.digest(convert_to(clean_code, 'UTF8'), 'sha256'), right(clean_code, 4), tag_label, current_user_id);
    seen_codes := array_append(seen_codes, clean_code);
    inserted_count := inserted_count + 1;
  end loop;

  return inserted_count;
end;
$$;
revoke all on function public.admin_create_tag_codes(jsonb) from public, anon;
grant execute on function public.admin_create_tag_codes(jsonb) to authenticated;

create or replace function public.admin_list_tag_codes()
returns table (
  tag_name text,
  code_suffix text,
  created_at timestamptz,
  claimed boolean,
  claimed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_tagsrus_admin() then
    raise exception 'Only a TagsRUs admin can view tag codes.';
  end if;
  return query
    select c.tag_name, c.code_suffix, c.created_at, c.claimed_by is not null, c.claimed_at
    from private.tag_claim_codes c
    order by c.created_at desc
    limit 250;
end;
$$;
revoke all on function public.admin_list_tag_codes() from public, anon;
grant execute on function public.admin_list_tag_codes() to authenticated;
