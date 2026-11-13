-- Create the owner profile when an auth user is created, including when email
-- confirmation is enabled and the browser has no authenticated DB session yet.
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
    id, person_name, privacy_acknowledged_at,
    privacy_acknowledgement_version, customer_acknowledged_at
  ) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    accepted_at,
    '2026-11-11',
    accepted_at
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

drop trigger if exists on_auth_user_created_tagsrus on auth.users;
create trigger on_auth_user_created_tagsrus
  after insert on auth.users
  for each row execute function public.handle_new_tagsrus_user();
