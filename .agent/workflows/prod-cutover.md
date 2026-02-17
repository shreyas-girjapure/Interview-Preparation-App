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

3. Verify dev/prod DB parity:

```bash
npm run db:verify:dev-prod
```

4. If parity is required, sync prod data from dev:

```bash
# schema reset + migration replay + data sync
npm run db:sync:dev-prod:reset
```

5. Run production guardrail smoke:

```bash
npm run db:smoke:guardrail:prod
```

6. Re-check parity:

```bash
npm run db:verify:dev-prod
```
