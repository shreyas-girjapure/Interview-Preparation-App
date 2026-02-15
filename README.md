# Interview Preparation App

A Next.js app for interview preparation - question browsing, practice flows, and topic-first learning.

## Repository layout

- `src/` - Next.js app source (App Router, components, lib)
- `public/` - static assets
- `docs/` - planning and architecture notes
- `.github/workflows/` - CI pipeline

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

1. Create `.env.local` from `.env.example`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project.
3. Set `SUPABASE_SERVICE_ROLE_KEY` for server-side admin operations only.
4. Keep `NEXT_PUBLIC_APP_URL` as `http://localhost:3000` for local development.

The app validates these variables at runtime and fails fast when values are missing or invalid.

## Supabase Auth setup (Google)

1. In Supabase dashboard, open `Authentication -> Providers -> Google` and enable the provider.
2. In Supabase dashboard, open `Authentication -> URL Configuration`.
3. Set Site URL:
   - Local: `http://localhost:3000`
   - Production: your deployed app URL
4. Add redirect URLs:
   - Local callback: `http://localhost:3000/auth/callback`
   - Production callback: `https://<your-domain>/auth/callback`
5. In Google Cloud Console (OAuth client), add Supabase callback URL as an authorized redirect URI:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - If you use a custom Supabase auth domain, use that domain instead.
   - Do **not** use your app callback URL (`/auth/callback`) in Google redirect URIs.

Local auth flow in this app:

- Start sign-in: `/login`
- OAuth callback: `/auth/callback`
- Signed-in page: `/account`
- Sign-out endpoint: `/auth/sign-out`

## Supabase DB schema setup

Apply the initial schema + RLS migration from:

- `supabase/migrations/20260214014000_phase1_schema.sql`

You can run it in Supabase SQL Editor, or with Supabase CLI if you use local/dev databases.

For ongoing table/column/index changes, use:

- `docs/SUPABASE_MIGRATION_PLAYBOOK.md`
- `scripts/supabase-migrate.ps1`

Common DB workflow commands:

```bash
npm run db:migrate:dev:dry
npm run db:migrate:dev
npm run db:smoke:guardrail:dev
```

Notes:

- `db:smoke:guardrail*` validates the published-question topic-link guardrail end to end and cleans up test data.
- It uses `SUPABASE_SERVICE_ROLE_KEY` when present; if that value is a placeholder, it falls back to fetching the key using `SUPABASE_ACCESS_TOKEN`.

## Quality checks

```bash
npm run lint
npm run format
npm run test
npm run build
```

Or run all checks:

```bash
npm run ci
```

## Deployment notes

- Platform: Vercel
- Build command: `npm run build`
- Install command: `npm ci`
- Required env vars: set all variables listed in `.env.example`
- Branch strategy:
  - `dev`: active development and preview deployments
  - `main`: production deployments
- Production deployment guard: Vercel builds fail automatically when `VERCEL_ENV=production` and `VERCEL_GIT_COMMIT_REF` is not `main`.
  - Emergency override: set `ALLOW_NON_MAIN_PROD_DEPLOY=true` in Vercel envs.
