# Data Gathering and Ingestion Plan

Last updated: 2026-02-15

## Purpose

Define a practical, review-gated path to gather interview content at scale, ingest it safely, and promote only approved records into canonical tables.

This plan operationalizes:

- `docs/SCHEMA_PLAN_BASE.md`
- `docs/SCHEMA_DIAGRAM.md`
- EPIC-E (`docs/user-stories/epics/EPIC-E-content-operations-v2.md`)
- EPIC-F (`docs/user-stories/epics/EPIC-F-preparation-category-taxonomy-llm-intake.md`)

## Current Baseline

- Canonical taxonomy is active: `categories -> topics -> question_topics -> questions`.
- Query compatibility and multi-category discoverability are in place.
- A DB guardrail already blocks `published` questions with zero linked topics.
- Manual bulk updates currently happen through Supabase CSV importer.
- Crawler automation is still deferred.

## Non-Negotiable Rules

1. No auto-publish from imports, crawler output, or LLM suggestions.
2. Every promotion to canonical tables must be auditable.
3. Topic ownership remains single-category via `topics.preparation_category_id`.
4. Question-category discoverability remains derived via `question_topics -> topics -> categories`.
5. Staging data is private to admin/editor workflows (no public reads).

## Source Strategy

### Wave 1 (Now): Manual + Curated Sources

- Curated internal datasets (CSV/SQL).
- Trusted public docs manually copied or summarized into source rows.
- Existing seed/demo content for integration tests.

### Wave 2 (After Review Workflow): Assisted Intake

- LLM topic candidate generation from raw question text.
- LLM question-topic suggestions restricted to approved topics.

### Wave 3 (Deferred): Crawler Discovery

- Crawler output lands in moderation queue only.
- No canonical write until human approval.

## Ingestion Pipeline

1. Intake batch creation.
2. Raw question staging write.
3. Normalization and dedupe precheck.
4. LLM topic candidate generation (optional per batch).
5. Human review of topic candidates.
6. LLM question-topic suggestion generation against approved topics only.
7. Human review of question-topic suggestions.
8. Canonical promotion transaction for approved records.
9. Post-promotion quality audit and integrity report.

## Staging Schema Contract

Create these staging tables in a new migration:

1. `public.ingest_batches`
2. `public.ingest_raw_questions`
3. `public.ingest_topic_candidates`
4. `public.ingest_question_topic_suggestions`
5. `public.ingest_review_decisions`
6. `public.ingest_promotion_runs`
7. `public.ingest_promotion_items`

Recommended status lifecycle:

- Batch: `received`, `parsed`, `topic_suggested`, `topic_review`, `tag_suggested`, `tag_review`, `promotion_ready`, `promoted`, `blocked`, `failed`
- Candidate/Suggestion item: `pending`, `approved`, `rejected`, `promoted`

Required metadata fields:

- Source metadata: `source_name`, `source_type`, `source_url`, `source_item_key`
- Model metadata: `model_name`, `model_version`, `prompt_version`, `confidence`
- Audit metadata: `created_by`, `reviewed_by`, `reviewed_at`, `decision_reason_code`
- Raw payload retention: `raw_payload jsonb` on raw-question rows

## Dedupe and Conflict Controls

Implement two-layer dedupe:

1. Exact duplicate detection:
- Deterministic `normalized_hash` on title + question body.
- Unique guard per source scope (`source_name`, `source_item_key`) where available.

2. Near duplicate detection:
- Similarity check using normalized title/body (for example trigram).
- Queue near matches for manual decision; do not auto-merge.

Canonical conflict policy:

- Topic slug collision: update existing topic only after approval + compatible category rule.
- Question slug collision: update existing question only after approval.
- Relationship collision (`question_id`, `topic_id`): idempotent upsert with `sort_order`.

## Canonical Promotion Rules

Promotion job must run in a transaction and enforce:

1. Only `approved` staging rows are eligible.
2. Topic creation/upsert always sets valid `preparation_category_id`.
3. Question creation/upsert never bypasses topic-link requirement for publishing.
4. `question_topics` rows are written before any question publish transition.
5. Promotion run writes:
- Run summary (`ingest_promotion_runs`)
- Row-level outcomes (`ingest_promotion_items`)

Post-promotion report must include:

- Questions promoted
- Topics promoted
- Rejections by reason code
- Duplicate conflicts encountered
- Integrity check: published questions without topics (expected `0`)

## Security and Access

1. Enable RLS on all ingest tables.
2. Read/write access limited to `admin` and `editor` roles.
3. No `anon` grants on staging tables.
4. Service-role usage only in server-side scripts/routes.

## Operational Playbooks

Define and version these playbooks:

1. CSV template and import checklist.
2. Review checklist (topic candidates + question-topic suggestions).
3. Promotion checklist with rollback steps.
4. Incident response for bad promotions.

Each playbook should include:

- Precheck queries
- Dry-run steps
- Apply steps
- Verification queries
- Rollback queries

## Success Metrics

- Parse success rate: target >= 98% per batch.
- Duplicate precision: target >= 90% for flagged near-duplicates.
- Review turnaround: median < 48 hours per batch.
- Promotion failure rate: target < 2%.
- Integrity violations after promotion: target = 0.

## Milestones

### Milestone 1 (Week of 2026-02-16)

- Add staging schema migration + RLS + indexes.
- Add enums/check constraints for statuses and reason codes.
- Add baseline SQL views for moderation queues.

### Milestone 2 (Week of 2026-02-23)

- Finalize CSV templates and import playbook (US-012).
- Implement exact + near-duplicate detection and decision recording (US-013).

### Milestone 3 (Week of 2026-03-02)

- Implement LLM topic candidate generation + review workflow (US-018).

### Milestone 4 (Week of 2026-03-09)

- Implement LLM question-topic suggestion review workflow (US-019).

### Milestone 5 (Week of 2026-03-16)

- Implement canonical promotion runner + audit report (US-020).

### Milestone 6 (Deferred until earlier milestones stabilize)

- Build crawler ingestion POC behind moderation queue (US-014).

## Immediate Next Actions

- [ ] Create migration for ingest schema and policies.
- [ ] Add moderation queue views and verification SQL.
- [ ] Draft CSV templates and import/review checklists.
- [ ] Implement promotion run tables and stored procedure/function.
- [ ] Add smoke test script for published-question topic guardrail after promotion.
