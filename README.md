# TagsRUs

TagsRUs is a responsive React/Vite storefront and customer experience for the TagsRUs NFC Emergency Contact Tag, a product brand of Trent’s 3D Prints.

## Current architecture

This workspace was empty before implementation. There was no existing framework, router, database, Supabase project, Stripe integration, or deployment configuration to preserve. The current build is a Vite + React single-page app with React Router routes for the storefront, checkout handoff, auth screens, dashboard, profile editor, public NFC profile, and legal pages.

The UI includes a local preview state so the experience can be reviewed end-to-end without pretending that a payment or account was created. The dashboard and public profile routes are ready to be connected to a real backend; the demo PIN shown in the public profile preview is `246810`.

## Routes

- `/` — storefront
- `/login` and `/signup` — account entry screens
- `/checkout` — product purchase handoff
- `/dashboard` — My Tags dashboard preview
- `/dashboard/profiles/:id` — profile editor preview
- `/t/:token` — read-only public NFC profile
- `/privacy` and `/terms` — legal drafts

## Database migration

`supabase/migrations/20261111000000_tagsrus_launch.sql` defines the relational model, ownership relationships, foreign-key indexes, hashed-PIN storage slots, acceptance records, a private access-attempt throttle table, and owner-scoped RLS policies. Anonymous visitors are not granted access to the base tables; `get_tagsrus_public_profile` returns only active tags and fields explicitly marked public. Protected fields are returned only by a PIN verification function, with failed attempts temporarily locking access to that profile.

## Supabase setup

Copy `.env.example` to `.env` and set the Supabase project URL and publishable (or legacy anon) key. Never put a service-role key in a `VITE_` variable. The app uses Supabase Auth for signup, login, session persistence, email confirmation, password reset, account-scoped dashboard queries, profile edits, emergency contacts, medical details, and tag activation.

Profile and contact photos use the `tag-profile-photos` Supabase Storage bucket. Photos must be JPG, PNG, or WebP and no larger than 5 MB. Profile photos and photos for public contacts appear on the public tag page; photos for PIN-protected contacts are returned only after PIN verification.

Apply migrations in order with the Supabase CLI linked to your project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Configure Supabase Auth's Site URL and redirect URL allowlist to include the local app, for example `http://localhost:5173/**`, plus the deployed site URL. Email confirmation and password reset require a working Supabase email provider.

## Admin access and tag inventory

Create your account through the app first, then assign it the admin role from **Supabase Dashboard → SQL Editor**. Replace the email below with the exact address used for your account:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('you@example.com')
on conflict (user_id) do update set role = excluded.role;
```

After the role migration is applied, log back in and open **My Tags → Tag admin** (or `/admin/tags`). Generate one or more activation codes and download or copy them right away. The full code is only displayed once; Supabase stores a SHA-256 hash and the last four characters. Print each code on a physical tag. When a customer enters it under **My Tags → Add a tag**, the database atomically claims it and creates an active tag on that account.

To remove admin access, run `delete from public.user_roles where user_id = (select id from auth.users where lower(email) = lower('you@example.com'));` in the SQL Editor. Admin permissions are never editable from the app itself.

## Other production configuration still required

The public NFC profile uses restricted database functions to return active tags, public fields, and PIN-verified protected fields. Stripe Checkout or Payment Links still need production server-side integrations. HTTPS deployment and SPA fallback routing are required for production.

Environment variables once the remaining server-side integrations are added:

```text
VITE_PUBLIC_SITE_URL=https://trentenritter.com
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-side only; never expose to the browser
STRIPE_SECRET_KEY=               # server-side only
STRIPE_WEBHOOK_SECRET=           # server-side only
VITE_STRIPE_PUBLISHABLE_KEY=
```

## Local development

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```

## Launch limitations

The visual and interaction layer is complete, but production authentication, database persistence, PIN security, email verification, and Stripe confirmation are not configured because no external credentials or existing integrations were supplied. The app does not claim a purchase, account, or security control has completed until those services are connected and tested.
