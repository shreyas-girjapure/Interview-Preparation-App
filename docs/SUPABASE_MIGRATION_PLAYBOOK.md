# Supabase Migration Playbook

Use this playbook whenever you add a table, alter a table, add/drop indexes, or adjust constraints.

## Scope

- Source of truth for schema changes: `supabase/migrations/`
- Safe flow: local -> dev -> prod
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

## Automation Script

Use `scripts/supabase-migrate.ps1`.

- Targets:
  - `local`
  - `dev` (`stxikhpofortkerjeuhf`)
  - `prod` (`xglbjcouoyjegryxorqo`)
- Safety:
  - Always runs dry-run before remote apply.
  - Requires explicit `-ConfirmProd` for prod apply.

## NPM Shortcuts

```bash
npm run db:migrate:local
npm run db:reset:local
npm run db:migrate:dev:dry
npm run db:migrate:dev
npm run db:migrate:prod:dry
npm run db:migrate:prod
```

## Manual Command Flow

### Local

```bash
npx supabase migration up --local
```

or full replay:

```bash
npx supabase db reset --local
```

### Dev

```bash
npx supabase link --project-ref stxikhpofortkerjeuhf --yes
npx supabase db push --linked --dry-run
npx supabase db push --linked --yes
npx supabase migration list --linked
```

### Prod

```bash
npx supabase link --project-ref xglbjcouoyjegryxorqo --yes
npx supabase db push --linked --dry-run
npx supabase db push --linked --yes
npx supabase migration list --linked
```

## Verification Checklist (after push)

1. Migration appears in `supabase migration list --linked`.
2. App build passes: `npm run build`.
3. API smoke:
   - `/api/questions`
   - `/api/topics`
4. Page smoke:
   - `/questions`
   - `/topics`

## Troubleshooting

1. Docker pipe/engine error on local commands:
   - Start Docker Desktop and rerun `npx supabase start`.
2. Linked push target uncertainty:
   - Check linked ref in `supabase/.temp/project-ref`.
3. SQL failure during push:
   - Fix migration SQL in a **new** migration if already applied somewhere.
   - If not applied anywhere, patch the pending migration and rerun dry-run.
