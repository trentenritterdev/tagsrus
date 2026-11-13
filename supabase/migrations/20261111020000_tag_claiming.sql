-- Tag codes are provisioned by an administrator as hashes. The browser only
-- receives a tag after this RPC atomically claims a matching unclaimed code.
create table if not exists private.tag_claim_codes (
  code_hash bytea primary key,
  tag_name text not null default 'Emergency Contact Tag',
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((claimed_by is null) = (claimed_at is null))
);
revoke all on table private.tag_claim_codes from anon, authenticated;

create or replace function public.claim_tagsrus_tag(p_code text)
returns table (id uuid, name text, status text, public_token text, profile_id uuid, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  claim_row private.tag_claim_codes%rowtype;
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

  insert into public.profiles (id, person_name)
    select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1))
    from auth.users u where u.id = current_user_id
    on conflict on constraint profiles_pkey do nothing;

  insert into public.tags (owner_id, profile_id, name)
    values (current_user_id, current_user_id, claim_row.tag_name)
    returning * into new_tag;
  update private.tag_claim_codes c set claimed_by = current_user_id, claimed_at = now()
    where c.code_hash = claim_row.code_hash;

  return query select new_tag.id, new_tag.name, new_tag.status, new_tag.public_token, new_tag.profile_id, new_tag.updated_at;
end;
$$;
revoke all on function public.claim_tagsrus_tag(text) from public, anon;
grant execute on function public.claim_tagsrus_tag(text) to authenticated;
