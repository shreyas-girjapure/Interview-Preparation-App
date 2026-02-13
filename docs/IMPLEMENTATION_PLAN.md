# Interview Preparation App - Implementation Plan

## Source of Truth

This document is the single source of truth for architecture, execution phases, and deployment tracking.

## Goals

- Performant frontend experience.
- Backend with admin panel + CMS to manage categories, questions, and answers.
- Database support for user preferences.
- Identity management using Google sign-in.
- Low long-term maintenance and low early-stage cost.

## Agreed Stack

- Frontend + app backend: Next.js (TypeScript, App Router).
- Database + Auth: Supabase (Postgres + Google OAuth via Supabase Auth).
- Hosting: Vercel (web/app), Supabase (DB/Auth).
- Admin/CMS: Custom in-app `/admin` panel (RBAC).
- UI system: `shadcn/ui` + Tailwind v4.
- Content rendering: Markdown + Shiki (`rehype-pretty-code`) with sanitization.

## High-Level Architecture

- Public app: question browsing, filters, details, and practice flows.
- Authenticated user area: onboarding + preferences + progress tracking.
- Admin area: CRUD for categories/questions/answers and publish workflow.
- API layer: Next.js route handlers/server actions.
- Data layer: Supabase Postgres with Row Level Security (RLS).

## Core Data Model (v1)

- users
- user_preferences
- categories
- questions
- answers
- question_attempts
- content_revisions

## API Surface (v1)

- GET `/api/questions`
- GET `/api/questions/:id`
- GET `/api/user/preferences`
- POST `/api/user/preferences`
- POST `/api/admin/questions`
- PATCH `/api/admin/questions/:id`
- POST `/api/admin/categories`
- PATCH `/api/admin/categories/:id`

## Delivery Phases

### Phase 0 - Foundation

- [x] Initialize project structure and TypeScript setup.
- [x] Configure lint, formatting, tests, and CI checks.
- [x] Configure environment variable management.

### Phase 1 - Data + Identity

- [ ] Create Supabase project(s): dev/staging/prod strategy.
- [ ] Define schema + migrations for v1 entities.
- [ ] Configure Google OAuth in Supabase Auth.
- [ ] Implement RBAC roles: admin, editor, user.
- [ ] Add RLS policies for user data isolation.

### Phase 2 - Learner Product

- [x] Build question list/detail pages.
- [x] Add category + difficulty filters.
- [ ] Build preference onboarding + persistence.
- [ ] Add attempt/progress tracking.

### Phase 3 - Admin CMS

- [ ] Build secure `/admin` area with role checks.
- [ ] Implement CRUD for categories/questions/answers.
- [ ] Add draft/review/publish flow.
- [ ] Add validation and revision history.

### Phase 4 - Performance + Reliability

- [ ] Add caching strategy (ISR/edge for read-heavy pages).
- [ ] Add DB indexes + pagination.
- [ ] Add error monitoring and analytics.
- [ ] Add backup and restore verification.

### Phase 5 - Deployment + Launch

- [ ] Configure Vercel environments: preview/staging/prod.
- [ ] Configure domain + TLS.
- [ ] Run production checklist and go live.
- [ ] Track post-launch issues and stabilization.

## Acceptance Criteria

- Google login works end-to-end.
- Non-admin users cannot access `/admin`.
- Admin can CRUD categories/questions/answers and publish content.
- User preferences are saved and isolated by RLS.
- Public pages meet acceptable performance targets.

## Constraints and Defaults

- Target usage: very early stage (10-20 daily users).
- Target early budget: 0-20 USD per month.
- Prefer managed services to reduce maintenance burden.
- Scope is web-first for v1.

## Decision Log

- 2026-02-13: Use managed core stack (Next.js + Supabase + Vercel).
- 2026-02-13: Keep CMS in-app rather than external self-hosted OSS CMS for v1.
- 2026-02-13: Use `shadcn/ui` for maintainable UI primitives.
- 2026-02-13: Use Markdown + Shiki pipeline for answer/code readability.
- 2026-02-13: Build initial learner product with local seeded interview questions before Supabase integration.

## Change Control

Any architecture or scope change must be added here before implementation starts.
