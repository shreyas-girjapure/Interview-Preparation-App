# Supabase Environment Strategy

## Scope

This document defines the dev and production Supabase setup for this project.
It supports Phase 1 delivery and does not require Phase 2 work.
Staging validation is handled in development for now.

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

## Release Flow

1. Build and validate in dev.
2. Apply migrations + smoke test in production during release window.
3. Monitor auth errors and RLS behavior post-release.

## Operational Safeguards

- Disable direct production SQL edits except for urgent hotfixes.
- Restrict service role key usage to server-side routes only.
- Keep backup/restore verification in launch checklist.
- Track auth callback URLs per environment to avoid misrouting.

## Open Tasks

- Create dedicated production Supabase project.
- Add environment-specific Google OAuth credentials and callback URLs for dev and production.
- Record project IDs and secret-management owners in ops notes.
