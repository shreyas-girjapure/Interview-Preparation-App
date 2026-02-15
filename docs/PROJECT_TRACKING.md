# Interview Preparation App - Project Tracking

Last updated: 2026-02-15

## Scope

- Build a topic-first interview prep app with readable question/answer pages.
- Use Supabase for auth + content storage + admin data operations.
- Keep content flow manual-first (draft -> preview -> publish), then add LLM-assisted ingestion.

## Current State

- Auth and account flows are live.
- Topic and question learner experiences are live.
- Admin composer is live at `/admin` with runtime preview and publish.
- Question metadata noise was removed (`tags`, `difficulty`, `estimated_minutes`).
- Database migrations for the above removals are applied in dev.

## Delivered

- US-001 Topic Catalog: Done
- US-002 Topic Overview Page: Done
- US-003 Question-to-Topic Linking: Done
- US-004 Code Snippet Readability: Done
- US-005 Structured Answer Format: Done
- US-009 Manage Topics: Done (inline topic create in composer)
- US-010 Manage Topic Relationships: Partial (question-topic links done; topic-edge management pending)
- US-011 Publish Workflow: Done
- US-012 Bulk Upsert: Done (Supabase CSV workflow)
- US-013 Deduplication Controls: Partial (draft-time duplicate warnings)
- US-015 Preparation Category Canonical Model: Done
- US-016 Question-Topic Category Integrity: Done
- US-017 Query Compatibility During Taxonomy Migration: Done

## Active Next

- Harden admin composer validations + error handling.
- Add ingestion staging schema + moderation queue tables/views.
- Implement promotion/audit workflow for approved staged content.

## Deferred

- US-014 Crawler Ingestion With Review Gate

## Planned (Not Started)

- US-018 LLM Topic Candidate Review Workflow
- US-019 LLM Question-Topic Suggestion Review Workflow
- US-020 Canonical Promotion and Quality Audit
