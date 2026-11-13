-- Track which activation code produced each tag so an unregister operation can
-- safely release only that code for reuse.
alter table private.tag_claim_codes
  add column if not exists claimed_tag_id uuid references public.tags(id) on delete set null;

create index if not exists tag_claim_codes_claimed_tag_id_idx
  on private.tag_claim_codes (claimed_tag_id);

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
  update private.tag_claim_codes c
    set claimed_by = current_user_id, claimed_at = now(), claimed_tag_id = new_tag.id
    where c.code_hash = claim_row.code_hash;

  return query select new_tag.id, new_tag.name, new_tag.status, new_tag.public_token, new_tag.profile_id, new_tag.updated_at;
end;
$$;
revoke all on function public.claim_tagsrus_tag(text) from public, anon;
grant execute on function public.claim_tagsrus_tag(text) to authenticated;

create or replace function public.unregister_tagsrus_tag(p_tag_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  tag_row public.tags%rowtype;
  claim_hash bytea;
begin
  if current_user_id is null then raise exception 'Sign in before unregistering a tag.'; end if;

  select * into tag_row
    from public.tags
    where id = p_tag_id and owner_id = current_user_id
    for update;
  if not found then raise exception 'That tag is not connected to your account.'; end if;

  select c.code_hash into claim_hash
    from private.tag_claim_codes c
    where c.claimed_tag_id = tag_row.id
       or (
         c.claimed_tag_id is null
         and c.claimed_by = current_user_id
         and c.tag_name = tag_row.name
         and (select count(*) from public.tags t
              where t.owner_id = current_user_id and t.name = tag_row.name) = 1
         and (select count(*) from private.tag_claim_codes c2
              where c2.claimed_by = current_user_id
                and c2.tag_name = tag_row.name
                and c2.claimed_tag_id is null) = 1
       )
    order by case when c.claimed_tag_id = tag_row.id then 0 else 1 end
    limit 1
    for update;

  delete from public.tags
    where id = tag_row.id and owner_id = current_user_id;

  if not exists (select 1 from public.tags where profile_id = tag_row.profile_id) then
    delete from public.profiles
      where id = tag_row.profile_id and owner_id = current_user_id;
  end if;

  if claim_hash is not null then
    update private.tag_claim_codes
      set claimed_by = null, claimed_at = null, claimed_tag_id = null
      where code_hash = claim_hash and claimed_by = current_user_id;
  end if;
end;
$$;
revoke all on function public.unregister_tagsrus_tag(uuid) from public, anon;
grant execute on function public.unregister_tagsrus_tag(uuid) to authenticated;
