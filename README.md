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

`supabase/migrations/20261111000000_tagsrus_launch.sql` defines the relational model, ownership relationships, foreign-key indexes, hashed-PIN storage slots, acceptance records, a private access-attempt throttle table, and owner-scoped RLS policies. Anonymous visitors are intentionally not granted access to the base tables; a production server route or Edge Function must project only active public fields and verify protected PINs without returning private fields before authorization.

## Production configuration still required

No credentials were present in the empty workspace. Before launch, connect:

1. Supabase Auth and Postgres with server-side APIs or edge functions.
2. Row Level Security for users, tags, profiles, contacts, medical details, visibility, PIN hashes, orders, and acceptance records.
3. A server-side PIN verification flow with hashing, per-tag/profile scope, expiration, rate limits, and temporary lockout.
4. Stripe Checkout or Payment Links with a real configured product price. The price is intentionally not invented in the UI.
5. Email verification and password-reset delivery.
6. HTTPS deployment at `trentenritter.com` with SPA fallback routing and `X-Robots-Tag: noindex` on public profile responses.

Recommended environment variables once the backend is added:

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
