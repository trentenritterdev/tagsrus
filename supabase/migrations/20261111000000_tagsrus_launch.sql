-- TagsRUs launch schema. Public NFC reads should go through a server-side
-- route/Edge Function that selects only public fields.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  person_name text not null check (char_length(person_name) between 1 and 160),
  photo_url text,
  identifying_description text check (identifying_description is null or char_length(identifying_description) <= 500),
  private_pin_hash text,
  confirmation_pin_hash text,
  privacy_acknowledged_at timestamptz,
  privacy_acknowledgement_version text,
  customer_acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'deactivated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  contact_name text not null check (char_length(contact_name) between 1 and 160),
  relationship text not null check (char_length(relationship) between 1 and 100),
  phone text not null check (char_length(phone) between 3 and 40),
  email text check (email is null or char_length(email) <= 320),
  visibility text not null default 'public' check (visibility in ('public', 'pin_protected')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_details (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  field_key text not null check (field_key in ('allergies', 'conditions', 'medications', 'devices', 'instructions', 'other')),
  field_value text not null check (char_length(field_value) between 1 and 2000),
  visibility text not null default 'pin_protected' check (visibility in ('public', 'pin_protected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, field_key)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  quantity integer not null default 1 check (quantity > 0),
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  acceptance_type text not null check (acceptance_type in ('terms', 'public_information_disclosure', 'customer_responsibility')),
  accepted_text text not null,
  version text not null,
  accepted_at timestamptz not null default now()
);

create table if not exists private.profile_access_attempts (
  scope_key text primary key,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now()
);

create index if not exists tags_owner_id_idx on public.tags (owner_id);
create index if not exists tags_profile_id_idx on public.tags (profile_id);
create index if not exists tags_active_token_idx on public.tags (public_token) where status = 'active';
create index if not exists emergency_contacts_profile_id_idx on public.emergency_contacts (profile_id, sort_order);
create index if not exists medical_details_profile_id_idx on public.medical_details (profile_id);
create index if not exists orders_owner_id_idx on public.orders (owner_id);
create index if not exists user_acceptances_user_id_idx on public.user_acceptances (user_id, accepted_at desc);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.tags enable row level security;
alter table public.tags force row level security;
alter table public.emergency_contacts enable row level security;
alter table public.emergency_contacts force row level security;
alter table public.medical_details enable row level security;
alter table public.medical_details force row level security;
alter table public.orders enable row level security;
alter table public.orders force row level security;
alter table public.user_acceptances enable row level security;
alter table public.user_acceptances force row level security;

create policy profiles_owner_select on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_owner_insert on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_owner_update on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy tags_owner_select on public.tags for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy tags_owner_insert on public.tags for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy tags_owner_update on public.tags for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy contacts_owner_select on public.emergency_contacts for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.id = (select auth.uid())));
create policy contacts_owner_insert on public.emergency_contacts for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.id = (select auth.uid())));
create policy contacts_owner_update on public.emergency_contacts for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.id = (select auth.uid())))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.id = (select auth.uid())));
create policy contacts_owner_delete on public.emergency_contacts for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.id = (select auth.uid())));

create policy medical_owner_select on public.medical_details for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.id = (select auth.uid())));
create policy medical_owner_insert on public.medical_details for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.id = (select auth.uid())));
create policy medical_owner_update on public.medical_details for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.id = (select auth.uid())))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.id = (select auth.uid())));
create policy medical_owner_delete on public.medical_details for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.id = (select auth.uid())));

create policy orders_owner_select on public.orders for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy acceptances_owner_select on public.user_acceptances for select to authenticated
  using ((select auth.uid()) = user_id);
create policy acceptances_owner_insert on public.user_acceptances for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Anonymous visitors do not query these tables. A server-side public-profile
-- handler must project only active public fields and verify private PINs.
revoke all on table public.profiles, public.tags, public.emergency_contacts,
  public.medical_details, public.orders, public.user_acceptances from anon;
revoke all on table private.profile_access_attempts from anon, authenticated;
