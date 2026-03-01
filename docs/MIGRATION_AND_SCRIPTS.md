# Migration and Scripts Runbook

Last updated: 2026-03-01

## 1. Supabase Environment Strategy

- **Development**: Local dev, synthetic/seed data. Google auth via localhost. Project: `stxikhpofortkerjeuhf`.
- **Production**: Live traffic, real content. Google auth via prod URLs. Project: `xglbjcouoyjegryxorqo`.

**Required Env Vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (in `.env.local` and `.env.production`).

## 2. Supabase Migration Playbook

Source of truth for schema changes: `supabase/migrations/`.
Always use forward-only migrations. Never edit applied migration files. Insert schema changes inside `begin; ... commit;`.

### Commands

- **Local:** `npx supabase start` | `npx supabase migration up --local` | `npx supabase db reset --local`
- **Agent Workflow:** Use `/db-push` workflow (`.agent/workflows/db-push.md`) for dev pushing.
- **Push to Remote (Dev/Prod):**
  ```bash
  npx supabase link --project-ref <project_ref> --yes
  npx supabase db push --linked --dry-run
  npx supabase db push --linked --yes
  npx supabase migration list --linked
  ```

## 3. Production Cutover Runbook

Goal: Ship code from `dev` to `main` and make production DB data match dev DB data in a repeatable, guardrail-safe way.

### Available NPM Scripts

- `npm run db:verify:dev-prod` : Compares dev vs prod row counts for public tables.
- `npm run db:sync:dev-prod` : Syncs dev data to prod (row replacement, FK-safe order).
- `npm run db:sync:dev-prod:reset` : Destructive reset of prod DB objects/data, then sync.
- `npm run db:smoke:guardrail:prod` : Final safeguard check after sync.

### Release Flow

1. Merge and push code:
   ```bash
   git checkout main
   git merge --no-ff dev -m "release: promote dev to main"
   git push origin main
   ```
2. Apply schema migrations to prod:
   ```bash
   npx supabase migration list --linked
   npx supabase db push --linked --yes
   ```
3. If syncing data exactly to match dev (wipes real prod data!): `npm run db:sync:dev-prod:reset`
4. If only updating rows (schema is aligned): `npm run db:sync:dev-prod`
5. Final checks: `npm run db:smoke:guardrail:prod` and `npm run db:verify:dev-prod`
