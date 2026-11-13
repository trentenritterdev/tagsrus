-- Public tag links expose only active tags and explicitly public fields.
-- PIN-protected contacts, medical details, PIN hashes, and account metadata
-- never leave the database through this function.
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
