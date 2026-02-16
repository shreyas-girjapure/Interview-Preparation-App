---
description: Push pending Supabase migrations to the remote dev database
---

# Push Migrations to Dev DB

Pushes any pending SQL migrations from `supabase/migrations/` to the remote Supabase dev project.

## Prerequisites
- `.env.local` must have `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, and `SUPABASE_DB_PASSWORD`

## Steps

// turbo
1. Source credentials from `.env.local` and link the project (idempotent):
```bash
export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d= -f2) && npx supabase link --project-ref $(grep SUPABASE_PROJECT_REF .env.local | cut -d= -f2) -p "$(grep SUPABASE_DB_PASSWORD .env.local | cut -d= -f2)" 2>&1
```

// turbo
2. Push pending migrations:
```bash
export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d= -f2) && npx supabase db push -p "$(grep SUPABASE_DB_PASSWORD .env.local | cut -d= -f2)" 2>&1
```

3. Verify by checking migration status:
```bash
export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d= -f2) && npx supabase migration list -p "$(grep SUPABASE_DB_PASSWORD .env.local | cut -d= -f2)" 2>&1
```

## Notes
- `NOTICE` messages about "does not exist, skipping" are expected on first run (from `DROP IF EXISTS` clauses)
- The `link` command is idempotent — safe to re-run
- To push to **production** instead, swap `.env.local` with `.env.production` in the commands above
