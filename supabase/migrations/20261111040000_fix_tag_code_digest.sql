-- Older deployments may already have applied the tag RPC migrations when
-- pgcrypto.digest was referenced in public. Keep those RPCs working by
-- providing a private-to-callers text overload that delegates to Supabase's
-- pgcrypto installation in the extensions schema.
create or replace function public.digest(data text, digest_type text)
returns bytea
language sql
immutable
strict
set search_path = ''
as $$
  select extensions.digest(convert_to(data, 'UTF8'), digest_type);
$$;

revoke all on function public.digest(text, text) from public, anon, authenticated;
