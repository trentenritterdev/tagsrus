-- Owners can set an access PIN without ever sending or reading the stored hash.
create or replace function public.set_tagsrus_access_pin(p_pin text)
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
    where id = auth.uid();
  if not found then raise exception 'Profile not found.'; end if;
end;
$$;
revoke all on function public.set_tagsrus_access_pin(text) from public, anon;
grant execute on function public.set_tagsrus_access_pin(text) to authenticated;

-- Anonymous visitors receive only an explicit protected-info flag plus public fields.
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
        'email', c.email
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

-- Private values are returned only after a bcrypt PIN check. Failed attempts
-- lock the profile for 15 minutes after five guesses.
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
    from public.tags t
    where t.public_token = p_token and t.status = 'active';
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
    update private.profile_access_attempts a
      set failed_attempts = 0, locked_until = null, last_attempt_at = now()
      where a.scope_key = scope;
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
          'email', c.email
        ) order by c.sort_order)
        from public.emergency_contacts c
        where c.profile_id = tag_profile_id and c.visibility = 'pin_protected'
      ), '[]'::jsonb),
      'medical_details', coalesce((
        select jsonb_agg(jsonb_build_object(
          'field_key', m.field_key,
          'field_value', m.field_value
        ) order by m.created_at)
        from public.medical_details m
        where m.profile_id = tag_profile_id and m.visibility = 'pin_protected'
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
