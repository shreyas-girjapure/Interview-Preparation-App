# Supabase Environment Strategy

## Scope

This document defines the dev and production Supabase setup for this project.
It supports Phase 1 delivery and does not require Phase 2 work.
Staging validation is handled in development for now.

Detailed migration SOP: `docs/SUPABASE_MIGRATION_PLAYBOOK.md`

## Environments

## 1. Development

- Purpose: local development and schema iteration.
- Data: synthetic and seed-only.
- Auth providers: Google enabled with localhost callbacks.
- Project: existing local/dev project (`stxikhpofortkerjeuhf`) can continue as temporary dev.

## 2. Production

- Purpose: live traffic.
- Data: real content and user activity.
- Auth providers: Google enabled with production callback URLs.
- Access controls: strict least-privilege key handling and protected dashboard access.

## Naming Convention

- Suggested Supabase projects:
  - `interview-prep-dev`
  - `interview-prep-prod`

## Environment Variables

Each deployment target must set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## Migration Strategy

- Source of truth: `supabase/migrations/`.
- Apply migrations in order: dev -> prod.
- Never edit applied migrations in-place for higher environments.
- Use forward-only migrations for schema evolution.

## CLI Runbook (Link + Migration)

These commands were verified against `Supabase CLI 2.76.8` via `npx supabase --help`.

### Prerequisites

1. Docker Desktop must be running for local commands (`supabase start`, `supabase status`, `--local` db commands).
2. Supabase auth token must be available for linked/remote commands (`supabase link`, `--linked` db commands).
3. Run commands from repo root where `supabase/config.toml` exists.

### Link this repo to a remote Supabase project

```bash
npx supabase login
npx supabase link --project-ref <project_ref>
```

Optional direct connection mode:

```bash
npx supabase link --project-ref <project_ref> --skip-pooler
```

### Start and verify local Supabase

```bash
npx supabase start
npx supabase status
```

If local status fails with Docker engine/pipe errors, start Docker Desktop and retry.

### Apply migrations locally

Incremental apply:

```bash
npx supabase migration up --local
```

Reset local DB and replay migrations:

```bash
npx supabase db reset --local
```

### Apply migrations to linked project (dev/prod with care)

Preview:

```bash
npx supabase db push --linked --dry-run
```

Apply:

```bash
npx supabase db push --linked
```

### Verify migration state

```bash
npx supabase migration list --local
npx supabase migration list --linked
```

### Safe release order

1. `npx supabase migration up --local` (or reset local).
2. App smoke tests.
3. `npx supabase db push --linked --dry-run` on target.
4. `npx supabase db push --linked`.
5. `npx supabase migration list --linked` and app smoke tests.

## Release Flow

1. Build and validate in dev.
2. Apply migrations + smoke test in production during release window.
3. Monitor auth errors and RLS behavior post-release.

## Operational Safeguards

- Disable direct production SQL edits except for urgent hotfixes.
- Restrict service role key usage to server-side routes only.
- Keep backup/restore verification in launch checklist.
- Track auth callback URLs per environment to avoid misrouting.

## Phase 1 Completion Status (2026-02-14)

- Dedicated production Supabase project is created and in use (`xglbjcouoyjegryxorqo`).
- Environment-specific Google OAuth credentials and callback URLs are configured for dev and production.
- Vercel production environment variables are wired for the production Supabase project and app URL.

## Follow-up Ops Notes

- Record secret-management owners in ops notes when ownership is finalized.
