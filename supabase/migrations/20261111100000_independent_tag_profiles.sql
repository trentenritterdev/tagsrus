-- Give every tag its own profile. Legacy installs had one profile per account,
-- which caused edits to one tag to show up on every tag owned by that account.

alter table public.profiles
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

update public.profiles set owner_id = id where owner_id is null;
alter table public.profiles alter column owner_id set not null;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles drop constraint if exists profiles_id_fkey;
create index if not exists profiles_owner_id_idx on public.profiles(owner_id);

-- Keep the first tag on its existing profile. Give every additional tag a copy
-- so current customer data is preserved while subsequent edits become isolated.
do $$
declare
  shared_tag record;
  cloned_profile_id uuid;
begin
  for shared_tag in
    select id as tag_id, profile_id as source_profile_id
    from (
      select t.id, t.profile_id,
        row_number() over (partition by t.profile_id order by t.created_at, t.id) as profile_rank
      from public.tags t
    ) ranked
    where profile_rank > 1
  loop
    insert into public.profiles (
      owner_id, person_name, photo_url, identifying_description, private_pin_hash,
      confirmation_pin_hash, privacy_acknowledged_at,
      privacy_acknowledgement_version, customer_acknowledged_at, created_at, updated_at
    )
    select p.owner_id, p.person_name, p.photo_url, p.identifying_description, p.private_pin_hash,
      p.confirmation_pin_hash, p.privacy_acknowledged_at,
      p.privacy_acknowledgement_version, p.customer_acknowledged_at, p.created_at, now()
    from public.profiles p
    where p.id = shared_tag.source_profile_id
    returning id into cloned_profile_id;

    insert into public.emergency_contacts (
      profile_id, contact_name, relationship, phone, email, photo_url,
      visibility, sort_order, created_at, updated_at
    )
    select cloned_profile_id, c.contact_name, c.relationship, c.phone, c.email, c.photo_url,
      c.visibility, c.sort_order, c.created_at, c.updated_at
    from public.emergency_contacts c
    where c.profile_id = shared_tag.source_profile_id;

    insert into public.medical_details (
      profile_id, field_key, field_value, visibility, created_at, updated_at
    )
    select cloned_profile_id, m.field_key, m.field_value, m.visibility, m.created_at, m.updated_at
    from public.medical_details m
    where m.profile_id = shared_tag.source_profile_id;

    update public.tags set profile_id = cloned_profile_id where id = shared_tag.tag_id;
  end loop;
end;
$$;

drop policy if exists profiles_owner_select on public.profiles;
drop policy if exists profiles_owner_insert on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_select on public.profiles for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy profiles_owner_insert on public.profiles for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy profiles_owner_update on public.profiles for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy if exists contacts_owner_select on public.emergency_contacts;
drop policy if exists contacts_owner_insert on public.emergency_contacts;
drop policy if exists contacts_owner_update on public.emergency_contacts;
drop policy if exists contacts_owner_delete on public.emergency_contacts;
create policy contacts_owner_select on public.emergency_contacts for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())));
create policy contacts_owner_insert on public.emergency_contacts for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())));
create policy contacts_owner_update on public.emergency_contacts for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())));
create policy contacts_owner_delete on public.emergency_contacts for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())));

drop policy if exists medical_owner_select on public.medical_details;
drop policy if exists medical_owner_insert on public.medical_details;
drop policy if exists medical_owner_update on public.medical_details;
drop policy if exists medical_owner_delete on public.medical_details;
create policy medical_owner_select on public.medical_details for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())));
create policy medical_owner_insert on public.medical_details for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())));
create policy medical_owner_update on public.medical_details for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())));
create policy medical_owner_delete on public.medical_details for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())));

-- Preserve one account-level profile at signup, now with explicit ownership.
create or replace function public.handle_new_tagsrus_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_at timestamptz;
begin
  accepted_at := (new.raw_user_meta_data ->> 'accepted_at')::timestamptz;

  insert into public.profiles (
    id, owner_id, person_name, privacy_acknowledged_at,
    privacy_acknowledgement_version, customer_acknowledged_at
  ) values (
    new.id, new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    accepted_at, '2026-11-11', accepted_at
  ) on conflict (id) do nothing;

  if accepted_at is not null then
    insert into public.user_acceptances (user_id, profile_id, acceptance_type, accepted_text, version, accepted_at)
    values
      (new.id, new.id, 'terms', 'I agree to the TagsRUs Terms of Service.', '2026-11-11', accepted_at),
      (new.id, new.id, 'public_information_disclosure', 'I understand that information marked Public can be seen by anyone who scans my tag.', '2026-11-11', accepted_at),
      (new.id, new.id, 'customer_responsibility', 'I am responsible for the accuracy and visibility settings of information I provide.', '2026-11-11', accepted_at);
  end if;

  return new;
end;
$$;

-- A claimed tag gets a fresh profile instead of reusing the account profile.
create or replace function public.claim_tagsrus_tag(p_code text)
returns table (id uuid, name text, status text, public_token text, profile_id uuid, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  claim_row private.tag_claim_codes%rowtype;
  new_profile public.profiles%rowtype;
  new_tag public.tags%rowtype;
  clean_code text := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
begin
  if current_user_id is null then raise exception 'Sign in before connecting a tag.'; end if;
  if char_length(clean_code) < 6 or char_length(clean_code) > 64 then raise exception 'Enter a valid tag code.'; end if;

  select * into claim_row
    from private.tag_claim_codes c
    where c.code_hash = extensions.digest(convert_to(clean_code, 'UTF8'), 'sha256')
    for update;
  if not found then raise exception 'That tag code is not recognized.'; end if;
  if claim_row.claimed_by is not null then raise exception 'That tag has already been connected to an account.'; end if;

  insert into public.profiles (owner_id, person_name)
    select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1))
    from auth.users u where u.id = current_user_id
    returning * into new_profile;
  if not found then raise exception 'Account profile could not be created.'; end if;

  insert into public.tags (owner_id, profile_id, name)
    values (current_user_id, new_profile.id, claim_row.tag_name)
    returning * into new_tag;
  update private.tag_claim_codes c set claimed_by = current_user_id, claimed_at = now()
    where c.code_hash = claim_row.code_hash;

  return query select new_tag.id, new_tag.name, new_tag.status, new_tag.public_token, new_tag.profile_id, new_tag.updated_at;
end;
$$;
revoke all on function public.claim_tagsrus_tag(text) from public, anon;
grant execute on function public.claim_tagsrus_tag(text) to authenticated;

-- PIN status and changes are scoped to one owned profile (and never expose hashes).
drop function if exists public.set_tagsrus_access_pin(text);
create or replace function public.set_tagsrus_access_pin(p_profile_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to update your profile PIN.'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then raise exception 'Use a six-digit numeric PIN.'; end if;

  update public.profiles
    set private_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
        updated_at = now()
    where id = p_profile_id and owner_id = auth.uid();
  if not found then raise exception 'Profile not found.'; end if;
end;
$$;
revoke all on function public.set_tagsrus_access_pin(uuid, text) from public, anon;
grant execute on function public.set_tagsrus_access_pin(uuid, text) to authenticated;

drop function if exists public.has_tagsrus_access_pin();
create or replace function public.has_tagsrus_access_pin(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_profile_id and owner_id = auth.uid() and private_pin_hash is not null
  );
$$;
revoke all on function public.has_tagsrus_access_pin(uuid) from public, anon;
grant execute on function public.has_tagsrus_access_pin(uuid) to authenticated;
