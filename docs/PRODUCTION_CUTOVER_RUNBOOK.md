# Production Cutover Runbook

Last updated: 2026-02-18

## Goal

Ship code from `dev` to `main` and make production DB data match dev DB data in a repeatable way.

## What Failed Previously

1. Git push blocked by formatting:
   - pre-push hook runs `npm run ci`
   - `prettier --check` failed after large merge
2. `supabase db dump` failed:
   - CLI path required Docker image tooling on this machine
   - Docker Desktop was unavailable
3. Data sync failed on publish guardrails:
   - deleting `question_topics` failed when questions were `published`
   - inserting `questions` as `published` failed before topic links existed
4. Production reset reseeded data:
   - migration seed files inserted baseline content
   - data then diverged from dev until explicit sync

## Improvements Added

1. New automation script:
   - `scripts/sync-dev-to-prod-public-data.mjs`
2. New npm commands:
   - `npm run db:verify:dev-prod`
   - `npm run db:sync:dev-prod`
   - `npm run db:sync:dev-prod:reset`
3. Guardrail-safe sync logic:
   - downgrade target questions to `draft`
   - delete/insert in FK-safe order
   - insert questions as `draft`, then restore original statuses
4. Built-in verification:
   - compares dev vs prod row counts for key public tables

## Prerequisites

1. `.env.local` contains dev project values.
2. `.env.production` contains prod project values.
3. Both files include:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_PROJECT_REF`
   - `SUPABASE_DB_PASSWORD`
   - `SUPABASE_ACCESS_TOKEN`
4. You accept destructive behavior when running `db:sync:dev-prod:reset`.

## Standard Release Flow

1. Merge and push code:
   - `git checkout main`
   - `git merge --no-ff dev -m "release: promote dev to main"`
   - `git push origin main`
2. Pre-check DB parity:
   - `npm run db:verify:dev-prod`
3. If parity is not required to preserve existing prod activity:
   - `npm run db:sync:dev-prod:reset`
4. If schema is already aligned and you only want row-level replacement:
   - `npm run db:sync:dev-prod`
5. Final guardrail check:
   - `npm run db:smoke:guardrail:prod`

## Table Scope for Sync

Script syncs these public tables:

- `users`
- `user_preferences`
- `categories`
- `subcategories`
- `topics`
- `questions`
- `answers`
- `question_topics`
- `topic_edges`

Script verifies these too:

- `content_revisions`
- `question_attempts`
- `user_question_progress`
- `user_topic_progress`
- `playlists`
- `playlist_items`
- `user_playlist_progress`

## Safety Notes

1. This process is for controlled cutover windows.
2. `db:sync:dev-prod:reset` wipes production DB objects/data first.
3. Auth users are created in prod if present in dev and missing in prod.
4. Keep this for internal/test environments only unless business approves destructive cloning.
