# Interview Preparation App - Implementation Plan

## Source of Truth

This document is the single source of truth for architecture, execution phases, and deployment tracking.
Implementation status dashboard: `docs/IMPLEMENTATION_PROGRESS.md`.

## Execution Focus

- Total phases: 6.
- Active work can proceed across phases based on priority.
- Crawler discovery work is deferred for now.

## Goals

- Performant frontend experience.
- Topic-first learner journey with rabbit-hole navigation between related concepts.
- Supabase-managed content operations for topics, questions, and answers (dashboard/CSV/SQL).
- Database support for user preferences.
- Identity management using Google sign-in.
- Low long-term maintenance and low early-stage cost.

## Agreed Stack

- Frontend + app backend: Next.js (TypeScript, App Router).
- Database + Auth: Supabase (Postgres + Google OAuth via Supabase Auth).
- Data access policy: Supabase-first (`supabase-js` + RLS), add custom app routes only when orchestration or privileged server behavior is required.
- Hosting: Vercel (web/app), Supabase (DB/Auth).
- Content management: Supabase dashboard + SQL/CSV workflows (no custom in-app admin panel for v1).
- UI system: `shadcn/ui` + Tailwind v4.
- Content rendering: Markdown + Shiki (`rehype-pretty-code`) with sanitization.

## Supabase-First Strategy (Performance + Security)

- Keep Supabase as the default CRUD/API layer; avoid duplicate app-side CRUD wrappers.
- Prefer server-side data access for write operations and privileged logic (multi-step mutations, service-role use).
- Allow direct client writes only for low-risk user-owned rows protected by strict RLS.
- Keep service role keys server-only; never expose them to browser code.
- Use least-privilege RLS policies as primary authorization boundary.
- Optimize reads with pagination, narrow column selection, and indexes on hot filters/sorts.
- Use caching/ISR for read-heavy public pages to reduce DB round-trips.

## Design Choices (UI/UX)

- Product style: minimal, editorial, readability-first layout inspired by top reading products (for example: Medium).
- Design benchmark principle: use clean typography, restrained color usage, generous spacing, and low visual noise by default.
- Interview-product reference patterns: where useful, borrow information architecture patterns from interview platforms (for example: LeetCode topic/problem organization), without cloning branding or proprietary UI.
- Information architecture: primary navigation starts from topics, with a secondary path to browse all questions.
- Rabbit-hole behavior: answers expose linked topics so users can branch into adjacent concepts without leaving learning context.
- Auth entry pattern: provider-neutral actions in header (`Sign in`, `Get started`) instead of showing Google-specific CTA in the main hero.
- Sign-in flow pattern: dedicated `/login` card with one primary action (`Continue with Google`) and clear post-login redirect context.
- CTA hierarchy: primary browsing action (`Browse topics`) and secondary account action (`Open account`).
- Navigation behavior: show account/sign-out controls only when authenticated; keep guest navigation lightweight.
- Responsive/accessibility baseline: all auth and catalog actions remain usable on mobile and keyboard-focusable with visible focus states.

## High-Level Architecture

- Public app: topic directory, topic detail (overview + related questions), question detail with topic links, and practice flows.
- Authenticated user area: onboarding + preferences.
- Content operations: Supabase dashboard/SQL/CSV management for topics/questions/answers and relationships.
- API layer: Next.js route handlers/server actions.
- Data layer: Supabase Postgres with Row Level Security (RLS).

## Core Data Model (v1)

- users
- user_preferences
- topics
- question_topics
- topic_edges (optional for related-topic traversal; can be deferred behind recommendation queries)
- questions
- answers
- content_revisions
- categories (canonical Preparation Category taxonomy)

## API Surface (v1)

- GET `/api/topics`
- GET `/api/topics/:slug`
- GET `/api/questions`
- GET `/api/questions/:slug`

## Delivery Phases

### Phase 0 - Foundation

- [x] Initialize project structure and TypeScript setup.
- [x] Configure lint, formatting, tests, and CI checks.
- [x] Configure environment variable management.

### Phase 1 - Data + Identity

- [x] Implement app-side auth flow (`/login`, `/auth/sign-in`, `/auth/callback`, `/account`).
- [x] Create Supabase project(s): dev/production strategy.
- [x] Apply strategy from `docs/SUPABASE_ENVIRONMENT_STRATEGY.md` by creating production project and wiring envs.
- [x] Define schema + migrations for v1 entities.
- [x] Configure Google OAuth in Supabase Auth.
- [x] Implement RBAC roles: admin, editor, user.
- [x] Add RLS policies for user data isolation.
- [x] Verify local end-to-end identity flow (Google sign-in, callback, session, sign-out, `public.users` sync).

### Phase 2 - Learner Product

- [x] Build question list/detail pages.
- [x] Add category + difficulty filters (temporary before topic-first navigation is complete).
- [x] Build preference onboarding + persistence.
- [x] Add canonical topic model and migrate/alias existing categories.
- [x] Build topic list/detail pages (topic overview + related questions).
- [x] Add in-answer linked topics for rabbit-hole exploration.
- [ ] Add topic-driven recommendations ("continue learning") from topic/question relationships.
- [ ] Add animated cat brand asset integration (GIF import workflow from external design tool). (Low priority)
- [ ] Run UI polish pass for visual design refinements. (Low priority)
- [ ] Improve search and filtering interactions, including difficulty filter UX.

### Phase 3 - Content Operations (Supabase Managed)

- [x] Standardize on Supabase dashboard/SQL/CSV as the content management surface.
- [ ] Define repeatable update playbooks for topic/question/answer changes.
- [ ] Add relationship update checklist for `question_topics` and `topic_edges`.
- [ ] Document publish-state guardrails and review checklist.

### Phase 4 - Performance + Reliability

- [ ] Add caching strategy (ISR/edge for read-heavy pages).
- [ ] Add DB indexes + pagination for topic + question catalog queries.
- [ ] Add search quality improvements for topic/question retrieval.
- [ ] Add error monitoring and analytics.
- [ ] Add backup and restore verification.

### Phase 5 - Deployment + Launch

- [ ] Configure Vercel environments: preview/prod.
- [ ] Configure domain + TLS.
- [ ] Run production checklist and go live.
- [ ] Track post-launch issues and stabilization.

### Phase 6 - Content Operations (v2)

- [x] Use Supabase dashboard CSV importer for bulk category/question/answer updates (manual process).
- [ ] Define and document CSV templates + import checklist for repeatable operations.
- [ ] Add dedupe and conflict handling (slug collisions, semantic duplicates).
- [ ] Add freshness metadata and source attribution fields.
- [ ] Build crawler ingestion proof-of-concept behind moderation queue (no auto-publish). (Deferred)

## Acceptance Criteria

- Google login works end-to-end.
- Content maintainers can CRUD topics/questions/answers and relationships using Supabase workflows.
- Public app reflects content changes made through Supabase without code changes.
- Learners can start from a topic and move through related topics/questions.
- Question details render readable code blocks and linked topics.
- User preferences are saved and isolated by RLS.
- Public pages meet acceptable performance targets.

## Current Status

- 2026-02-13: Identity/auth milestone achieved in local development (`/login` Google OAuth + `/account` + sign-out).
- 2026-02-13: `public.users` row creation confirmed after successful sign-in.
- 2026-02-14: Question catalog, markdown answer rendering, and filter flows are in place with local seeded content.
- 2026-02-14: Topic catalog/detail routes and rabbit-hole topic links are live with seeded topic graph.
- 2026-02-14: Added Phase 2 schema migration for `topics`, `question_topics`, and `topic_edges`.
- 2026-02-14: Topic/question content reads now run from Supabase-backed queries (in-memory content removed).
- 2026-02-14: Demo content migration added and applied for topics/questions/answers and rabbit-hole links.
- 2026-02-14: In-app `/admin` route and admin nav entry removed; content management standardized on Supabase dashboard workflows.
- 2026-02-14: Production Supabase project (`xglbjcouoyjegryxorqo`) wired with Vercel env vars and production `NEXT_PUBLIC_APP_URL`.
- 2026-02-14: Production Google OAuth redirect mismatch resolved; sign-in callback config aligned across Google, Supabase, and app URLs.
- 2026-02-14: Bulk updates moved to Supabase CSV importer workflow (no in-app importer).
- 2026-02-14: Preferences save flow moved to direct Supabase client writes (RLS) and custom preferences API route removed.
- 2026-02-14: Progress-tracking tables and stories removed from active scope.
- 2026-02-15: Canonical Preparation Category migration applied (`topics.preparation_category_id` enforced, `questions.category_id` removed, and query compatibility maintained through `question_topics -> topics -> categories`).
- 2026-02-15: Multi-category topic/question demo content and relationships seeded for taxonomy compatibility validation.
- 2026-02-15: DB guardrail added to block `published` questions that have zero linked `question_topics` rows.
- Remaining product scope: connect topic-first learner flows to Supabase-backed content.

## Constraints and Defaults

- Target usage: very early stage (10-20 daily users).
- Target early budget: 0-20 USD per month.
- Prefer managed services to reduce maintenance burden.
- Scope is web-first for v1.

## Decision Log

- 2026-02-13: Use managed core stack (Next.js + Supabase + Vercel).
- 2026-02-13: Use `shadcn/ui` for maintainable UI primitives.
- 2026-02-13: Use Markdown + Shiki pipeline for answer/code readability.
- 2026-02-13: Build initial learner product with local seeded interview questions before Supabase integration.
- 2026-02-13: Implement first-pass Google sign-in UX and auth routes.
- 2026-02-13: Standardize auth UX on a common publication-style pattern: header sign-in entry + dedicated sign-in page primary OAuth action.
- 2026-02-13: Add initial Supabase schema migration with RLS/RBAC and sync authenticated users into `public.users` during OAuth callback.
- 2026-02-13: Add authenticated `user_preferences` API and account onboarding form to persist learner preferences in Supabase.
- 2026-02-13: Configure Google provider and verify login/logout flow in local with Supabase project `stxikhpofortkerjeuhf`.
- 2026-02-14: Adopt topic-first roadmap and staged content operations plan (manual CSV bulk updates first, crawler behind moderation).
- 2026-02-14: Lock design direction to minimal editorial UX with Medium-like readability and LeetCode-like topic/problem IA references where helpful.
- 2026-02-14: Environment policy updated to dev + production only (no dedicated staging backend).
- 2026-02-14: Defer crawler ingestion only; manage bulk uploads via Supabase CSV importer.
- 2026-02-14: Adopt Supabase-first data access for simple CRUD; removed app-side preferences CRUD wrapper route.
- 2026-02-14: Standardize on a security-first Supabase pattern: server-side writes by default, direct client writes only for low-risk user-owned rows under RLS, and caching/indexing for performance.
- 2026-02-14: Dropped custom in-app admin CMS from v1 plan; Supabase dashboard/SQL/CSV is the source of truth for content management.
- 2026-02-14: Remove progress tracking from v1 scope (schema + backlog) to keep roadmap focused on topic-first learning and content quality.
- 2026-02-15: Adopt canonical Preparation Category linkage on topics and derive question category membership through topic relationships.

## Change Control

Any architecture or scope change must be added here before implementation starts.
