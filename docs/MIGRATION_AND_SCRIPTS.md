# Migration and Scripts Runbook

Last updated: 2026-03-11

## 1. Supabase Environment Strategy

- **Local Docker**: `supabase start` / `.env.local`. Project ref: `local`.
- **Cloud Dev (Stage)**: `.env.stage`. Project ref: `stxikhpofortkerjeuhf`.
- **Production**: `.env.production`. Project ref: `xglbjcouoyjegryxorqo`.

**Required Env Vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (in each `.env.*`).

## 2. Schema Management

Source of truth: `supabase/migrations/`, anchored by `supabase/migrations/20260307000000_initial_schema.sql` plus forward-only migrations after that.

- **Never put seed/data INSERT statements in migration files.** Migrations are DDL only.
- Always use forward-only migrations. Insert schema changes inside `begin; ... commit;`.
- Keep `supabase/seed.sql` **idempotent**. Local workflows intentionally rerun it via `db push --include-seed`, so use `on conflict`, upserts, or a safe delete/insert pattern.

### Commands

- **Local Start:** `npm run db:start:local`
- **Local Status:** `npm run db:status:local`
- **Backup Local Data to Seed:** `npm run db:dump:seed:local`
- **Visual Local Dev (Recommended):** Make changes via Local Studio UI (http://127.0.0.1:54323) -> save to code with `node scripts/run-local-supabase-cli.mjs db diff -f <migration_name>`
- **Apply Pending Migrations Locally (Non-Destructive):** `npm run db:migrate:local`
- **Apply Pending Migrations + Seed File Changes Locally (Non-Destructive):** `npm run db:migrate:local:seed`
- **Apply Local Seed File Changes Without Resetting Data:** `npm run db:seed:local`
- **Reset Local DB (Destructive):** `npm run db:reset:local`
- **Push to Remote:** `npx supabase link --project-ref <ref> --yes` -> `npx supabase db push --linked --yes`

### Local Workflow Standard

1. Start local Supabase: `npm run db:start:local`
2. Confirm services: `npm run db:status:local`
3. Apply schema-only changes: `npm run db:migrate:local`
4. If the feature depends on lookup/config rows in `supabase/seed.sql`, run `npm run db:migrate:local:seed`

Use `db:migrate:local:seed` for any slice that introduces required pricing, config, or reference rows. This is the standard non-destructive path for schema plus seed-file changes.

### Seed Behavior

- `supabase seed --local` is **not** the repo standard for running `supabase/seed.sql`.
- In this repo, the reliable non-destructive seed path is `supabase db push --local --include-seed --yes`, wrapped as `npm run db:migrate:local:seed` and `npm run db:seed:local`.
- `db push --include-seed` applies `supabase/seed.sql` when the seed hash changes. Use it after editing `supabase/seed.sql` or when a new migration depends on new seed rows landing locally.
- `supabase db reset --local --yes` also runs `supabase/seed.sql`, but it is destructive and should only be used when you explicitly want a clean rebuild.

### Why The Wrapper Exists

`node scripts/run-local-supabase-cli.mjs ...` prefers an already-installed or cached Supabase CLI binary instead of relying on a fresh `npx` download. That avoids the npm registry/cache stalls that showed up during local migration work in sandboxed environments.

## 3. Data Sync Scripts

| Script                           | Purpose                                                             |
| -------------------------------- | ------------------------------------------------------------------- |
| `npm run db:sync:dev-prod`       | Full destructive sync (delete + re-insert) from dev -> prod         |
| `npm run db:sync:dev-prod:merge` | Upsert-only sync from dev -> prod (safe for single-question pushes) |
| `npm run db:sync:dev-prod:reset` | Reset prod schema + full sync                                       |
| `npm run db:sync:prod-local`     | Pull prod content into local (merge, content-only)                  |
| `npm run db:verify:dev-prod`     | Compare dev vs prod row counts                                      |
| `npm run db:verify:prod-local`   | Compare prod vs local row counts                                    |
| `npm run db:cutover:dev-prod`    | Full sync + guardrail smoke + verify                                |

## 4. Production Cutover Flow

1. `npm run ci` on dev branch
2. Merge dev -> main and push
3. Push schema: `npx supabase db push --linked --yes`
4. Sync data: `npm run db:sync:dev-prod:reset`
5. Verify: `npm run db:smoke:guardrail:prod` + `npm run db:verify:dev-prod`

## 5. Adding Content

- Use generation scripts or Supabase Studio to add questions to dev DB
- Push to prod: `npm run db:sync:dev-prod:merge`
- Pull from prod to local: `npm run db:sync:prod-local`
