alter table public.profiles
  add column gender text,
  add column age integer;

alter table public.profiles
  add constraint profiles_gender_allowed check (gender is null or gender in ('female', 'male', 'non_binary', 'other')),
  add constraint profiles_age_range check (age is null or age between 0 and 125);

-- Include the optional person details in the public projection.
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
    'gender', p.gender,
    'age', p.age,
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
