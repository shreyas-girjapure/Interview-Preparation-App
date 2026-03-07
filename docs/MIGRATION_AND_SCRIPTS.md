# Migration and Scripts Runbook

Last updated: 2026-03-07

## 1. Supabase Environment Strategy

- **Local Docker**: `supabase start` / `.env.local`. Project ref: `local`.
- **Cloud Dev (Stage)**: `.env.stage`. Project ref: `stxikhpofortkerjeuhf`.
- **Production**: `.env.production`. Project ref: `xglbjcouoyjegryxorqo`.

**Required Env Vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (in each `.env.*`).

## 2. Schema Management

Source of truth: `supabase/migrations/20260307000000_initial_schema.sql` (single squashed file).

- **Never put seed/data INSERT statements in migration files.** Migrations are DDL only.
- Always use forward-only migrations. Insert schema changes inside `begin; ... commit;`.

### Commands

- **Local:** `npx supabase start` | `npx supabase db reset --local`
- **Push to Remote:** `npx supabase link --project-ref <ref> --yes` → `npx supabase db push --linked --yes`

## 3. Data Sync Scripts

| Script                           | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `npm run db:sync:dev-prod`       | Full destructive sync (delete + re-insert) from dev → prod         |
| `npm run db:sync:dev-prod:merge` | Upsert-only sync from dev → prod (safe for single-question pushes) |
| `npm run db:sync:dev-prod:reset` | Reset prod schema + full sync                                      |
| `npm run db:sync:prod-local`     | Pull prod content into local (merge, content-only)                 |
| `npm run db:verify:dev-prod`     | Compare dev vs prod row counts                                     |
| `npm run db:verify:prod-local`   | Compare prod vs local row counts                                   |
| `npm run db:cutover:dev-prod`    | Full sync + guardrail smoke + verify                               |

## 4. Production Cutover Flow

1. `npm run ci` on dev branch
2. Merge dev → main and push
3. Push schema: `npx supabase db push --linked --yes`
4. Sync data: `npm run db:sync:dev-prod:reset`
5. Verify: `npm run db:smoke:guardrail:prod` + `npm run db:verify:dev-prod`

## 5. Adding Content

- Use generation scripts or Supabase Studio to add questions to dev DB
- Push to prod: `npm run db:sync:dev-prod:merge`
- Pull from prod to local: `npm run db:sync:prod-local`
