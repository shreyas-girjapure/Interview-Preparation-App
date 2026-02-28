---
description: Promote code to main and sync production DB data to match dev DB
---

# Production Cutover

Use this workflow when you want production app code and production DB data to match dev.

## Preconditions

- `.env.local` points to dev project.
- `.env.production` points to production project.
- Both env files contain:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_DB_PASSWORD`
  - `SUPABASE_PROJECT_REF`

## Steps

1. Verify branch state and run CI locally:

```bash
git checkout dev
npm run ci
```

2. Promote `dev` to `main`:

```bash
git checkout main
git merge --no-ff dev -m "release: promote dev to main"
git push origin main
```

3. Ensure linked prod schema is current:

```bash
npx supabase migration list --linked
npx supabase db push --linked --yes
```

4. Sync prod data from dev using **reset** (recommended — avoids Supabase schema cache issues that silently swallow inserts after new migrations):

```bash
npm run db:sync:dev-prod:reset
```

> **Why reset?** After new migrations that add columns, Supabase's PostgREST schema
> cache may not have refreshed yet. The regular sync (`db:sync:dev-prod`) can then
> silently fail to insert rows for those tables — the script reports success but rows
> are missing. `--reset-target` replays all migrations first, which forces the cache
> to rebuild before data is written. Always prefer this path.

5. Run production guardrail smoke:

```bash
npm run db:smoke:guardrail:prod
```

6. Re-check parity:

```bash
npm run db:verify:dev-prod
```

> If parity fails (non-zero exit) after the reset sync, something is genuinely wrong —
> do not proceed. Check the error output from step 4.
