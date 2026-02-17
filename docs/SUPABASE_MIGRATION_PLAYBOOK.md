# Supabase Migration Playbook

Use this playbook whenever you add a table, alter a table, add/drop indexes, or adjust constraints.

## Scope

- Source of truth for schema changes: `supabase/migrations/`
- Safe flow: local → dev → prod
- Rule: forward-only migrations, never edit an already-applied migration version

## When You Change Schema

1. Add a new migration file in `supabase/migrations/` with a new timestamp prefix.
2. Put schema changes inside `begin; ... commit;`.
3. Prefer idempotent statements where practical:
   - `create table if not exists ...`
   - `alter table ... add column if not exists ...`
   - `drop index if exists ...`
   - `create index if not exists ...`
4. If a migration can fail on existing data, add explicit precheck logic and clear error messages.
5. Run app build/tests after migration changes.

## Workflows

### Agent Workflow

Use the `/db-push` workflow (`.agent/workflows/db-push.md`) for pushing migrations to the remote dev database.

### Manual Command Flow

#### Dev

```bash
npx supabase link --project-ref stxikhpofortkerjeuhf --yes
npx supabase db push --linked --dry-run
npx supabase db push --linked --yes
npx supabase migration list --linked
```

#### Prod

```bash
npx supabase link --project-ref xglbjcouoyjegryxorqo --yes
npx supabase db push --linked --dry-run
npx supabase db push --linked --yes
npx supabase migration list --linked
```

#### Local (requires Docker Desktop)

Incremental apply:

```bash
npx supabase migration up --local
```

Reset local DB and replay migrations:

```bash
npx supabase db reset --local
```

## Verification Checklist (after push)

1. Migration appears in `supabase migration list --linked`.
2. App build passes: `npm run build`.
3. Page smoke:
   - `/questions`
   - `/topics`
   - `/admin` (requires admin role)

## Dev -> Prod Data Parity

If production must match dev data exactly (not just schema), use:

```bash
npm run db:verify:dev-prod
npm run db:sync:dev-prod
# or destructive reset + sync
npm run db:sync:dev-prod:reset
```

Detailed procedure and safeguards:

- `docs/PRODUCTION_CUTOVER_RUNBOOK.md`

## Troubleshooting

1. Docker pipe/engine error on local commands:
   - Start Docker Desktop and rerun `npx supabase start`.
2. Linked push target uncertainty:
   - Check linked ref in `supabase/.temp/project-ref`.
3. SQL failure during push:
   - Fix migration SQL in a **new** migration if already applied somewhere.
   - If not applied anywhere, patch the pending migration and rerun dry-run.
