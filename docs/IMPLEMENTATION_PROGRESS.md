# Implementation Progress Dashboard

Last updated: 2026-02-14

## Where To Check

- Scope and roadmap: `docs/IMPLEMENTATION_PLAN.md`
- Day-to-day implementation status: `docs/IMPLEMENTATION_PROGRESS.md` (this file)
- Story backlog: `docs/user-stories/README.md`

## Current Execution Mode

- Crawler discovery work is deferred.
- Active implementation can proceed for all other approved items.
- Environment model is `dev + production` (no dedicated staging backend).

## Phase Snapshot

- Phase 0 Foundation: Completed
- Phase 1 Data + Identity: Completed
- Phase 2 Learner Product: In progress
- Phase 3 Content Operations (Supabase-managed): In progress
- Phase 4 Performance + Reliability: Not started
- Phase 5 Deployment + Launch: Pending
- Phase 6 Content Operations v2: Pending

## Implemented

### Auth and Identity

- Google sign-in, callback, and sign-out flow implemented.
- `public.users` sync after OAuth callback implemented.
- RBAC and RLS policies implemented in initial migration.
- Preferences save now uses direct Supabase client writes with RLS (no custom preferences API route).
- Production Supabase project is configured (`xglbjcouoyjegryxorqo`) with production env vars on Vercel.
- Production Google OAuth callback configuration is fixed and validated.

### Learner Surface (current baseline)

- Question list and question detail pages implemented.
- Category and difficulty filters implemented.
- Account preference onboarding and persistence implemented.
- Markdown + highlighted code rendering implemented.
- Topic catalog and topic overview pages implemented (`/topics`, `/topics/[slug]`) with Supabase-backed topic graph data.
- Rabbit-hole topic links are now visible both in answer content markdown and in question detail topic chips/cards.
- In-memory interview content removed; topic/question/answer reads now come from Supabase.

### Content Operations

- Bulk updates are managed through Supabase dashboard CSV importer (manual process).
- Demo content migration is in place for test environments.
- In-app admin routes removed; content management is handled in Supabase dashboard/SQL/CSV workflows.

### Planning and Operations Docs

- Project overview normalized.
- User stories split into epics/stories folder structure.
- Supabase environment strategy documented for `dev + production`.
- Progress-tracking backlog/scope removed from active roadmap.

## In Progress / Remaining

### Phase 3 Content Operations (Supabase-managed)

- Define repeatable Supabase playbooks for topic/question/answer updates.
- Define relationship update checklist (`question_topics`, `topic_edges`).
- Document publish-state review and rollback steps.

### Phase 2 Learner Product

- Finalize topic-first recommendation flows.

### Phase 6 Content Operations v2

- Define CSV templates and import checklist.
- Add dedupe and conflict handling.

## Deferred (Do Not Implement Yet)

- Crawler ingestion and discovery automation.

## Notes

- If you want a quick status check, start with the `Phase Snapshot` section above.
- This file should be updated whenever a task changes state (implemented, in progress, deferred, blocked).
