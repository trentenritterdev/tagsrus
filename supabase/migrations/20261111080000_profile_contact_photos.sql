alter table public.emergency_contacts
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tag-profile-photos',
  'tag-profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists tag_profile_photos_owner_insert on storage.objects;
create policy tag_profile_photos_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tag-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists tag_profile_photos_owner_update on storage.objects;
create policy tag_profile_photos_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'tag-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'tag-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists tag_profile_photos_owner_delete on storage.objects;
create policy tag_profile_photos_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tag-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Keep the public projection restricted to active tags and public contacts.
create or replace function public.get_tagsrus_public_profile(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'tag_name', t.name,
    'person_name', p.person_name,
    'description', p.identifying_description,
    'photo_url', p.photo_url,
    'has_protected_info', exists (
      select 1 from public.emergency_contacts c
      where c.profile_id = p.id and c.visibility = 'pin_protected'
    ) or exists (
      select 1 from public.medical_details m
      where m.profile_id = p.id and m.visibility = 'pin_protected'
    ),
    'contacts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'contact_name', c.contact_name,
        'relationship', c.relationship,
        'phone', c.phone,
        'email', c.email,
        'photo_url', c.photo_url
      ) order by c.sort_order)
      from public.emergency_contacts c
      where c.profile_id = p.id and c.visibility = 'public'
    ), '[]'::jsonb),
    'medical_details', coalesce((
      select jsonb_agg(jsonb_build_object(
        'field_key', m.field_key,
        'field_value', m.field_value
      ) order by m.created_at)
      from public.medical_details m
      where m.profile_id = p.id and m.visibility = 'public'
    ), '[]'::jsonb)
  )
  from public.tags t
  join public.profiles p on p.id = t.profile_id
  where t.public_token = p_token and t.status = 'active'
  limit 1;
$$;
revoke all on function public.get_tagsrus_public_profile(text) from public, anon, authenticated;
grant execute on function public.get_tagsrus_public_profile(text) to anon, authenticated;

-- PIN verification also returns photos only for contacts visible after PIN entry.
create or replace function public.verify_tagsrus_profile_pin(p_token text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles%rowtype;
  tag_profile_id uuid;
  attempts private.profile_access_attempts%rowtype;
  scope text;
  next_failures integer;
begin
  select t.profile_id into tag_profile_id
    from public.tags t where t.public_token = p_token and t.status = 'active';
  if not found then raise exception 'This profile is unavailable.'; end if;
  select p.* into profile_row from public.profiles p where p.id = tag_profile_id;
  if profile_row.private_pin_hash is null then raise exception 'The profile owner has not set an access PIN.'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then raise exception 'Enter the six-digit access PIN.'; end if;

  scope := tag_profile_id::text;
  insert into private.profile_access_attempts (scope_key, failed_attempts, last_attempt_at)
    values (scope, 0, now()) on conflict (scope_key) do nothing;
  select a.* into attempts from private.profile_access_attempts a where a.scope_key = scope for update;
  if attempts.locked_until is not null and attempts.locked_until > now() then
    raise exception 'Too many incorrect attempts. Try again later.';
  elsif attempts.locked_until is not null then
    update private.profile_access_attempts a set failed_attempts = 0, locked_until = null, last_attempt_at = now() where a.scope_key = scope;
    attempts.failed_attempts := 0;
  end if;

  if extensions.crypt(p_pin, profile_row.private_pin_hash) = profile_row.private_pin_hash then
    delete from private.profile_access_attempts a where a.scope_key = scope;
    return jsonb_build_object(
      'contacts', coalesce((
        select jsonb_agg(jsonb_build_object(
          'contact_name', c.contact_name,
          'relationship', c.relationship,
          'phone', c.phone,
          'email', c.email,
          'photo_url', c.photo_url
        ) order by c.sort_order)
        from public.emergency_contacts c where c.profile_id = tag_profile_id and c.visibility = 'pin_protected'
      ), '[]'::jsonb),
      'medical_details', coalesce((
        select jsonb_agg(jsonb_build_object('field_key', m.field_key, 'field_value', m.field_value) order by m.created_at)
        from public.medical_details m where m.profile_id = tag_profile_id and m.visibility = 'pin_protected'
      ), '[]'::jsonb)
    );
  end if;

  next_failures := attempts.failed_attempts + 1;
  update private.profile_access_attempts a
    set failed_attempts = next_failures,
        locked_until = case when next_failures >= 5 then now() + interval '15 minutes' else null end,
        last_attempt_at = now()
    where a.scope_key = scope;
  raise exception 'That PIN did not match.';
end;
$$;
revoke all on function public.verify_tagsrus_profile_pin(text, text) from public;
grant execute on function public.verify_tagsrus_profile_pin(text, text) to anon, authenticated;
