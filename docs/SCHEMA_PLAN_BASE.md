# Schema Plan Base: Content Taxonomy & Ingestion

## Purpose

Define the canonical content taxonomy and ingestion flow. This document tracks decisions made and the migration path taken.

Reference diagram: `docs/SCHEMA_DIAGRAM.md`

## Current Status (2026-02-17)

> **Taxonomy migration is complete.** The 4-level hierarchy is live: Category → Subcategory → Topic → Question. All legacy columns (`preparation_category_id`, `difficulty`, `tags`, `estimated_minutes`) are dropped. LLM ingestion staging is planned but not yet built — see `docs/ROADMAP.md`.

## Final Hierarchy

1. **Category** — top-level preparation domain (e.g. Salesforce, JavaScript)
2. **Subcategory** — groups topics within a category (e.g. Apex Programming, LWC Development)
3. **Topic** — frontend learning navigation layer (e.g. Apex Triggers, Trigger Frameworks)
4. **Question** — linked to one or more topics via `question_topics`

Each topic belongs to exactly one subcategory. Each subcategory belongs to exactly one category. Questions can link to topics across multiple subcategories and categories.

## Canonical Decisions

1. Reuse `public.categories` as top-level preparation domains.
2. Added `public.subcategories` to group topics within a category.
3. Each topic has `subcategory_id` (replaced `preparation_category_id`).
4. Each question can map to many topics, including topics from different categories.
5. Question category is derived: `question_topics → topics → subcategories → categories`.
6. Removed `questions.difficulty`, `questions.tags`, `questions.estimated_minutes` — replaced by `question_type` and `seniority_level`.
7. Paywall implementation is deferred but schema is extensible (playlists have `access_level`).

## Target Schema Shape

1. `categories` — preparation domains with `is_active` flag
2. `subcategories` — grouping layer between categories and topics
3. `topics` — FK: `subcategory_id` (was `preparation_category_id`)
4. `questions` — no direct category FK; has `question_type` (standard/scenario/code_review) and `seniority_level` (junior/mid/senior/lead/architect)
5. `question_topics` — many-to-many join with `sort_order`
6. `playlists` / `playlist_items` — ordered question collections with type and access level
7. `user_*_progress` — spaced repetition columns (`review_status`, `next_review_at`, `ease_factor`, `review_count`)

## Migration History

### Phase A: Additive and Safe ✅

Delivered in `20260214154000_phase2_topic_graph.sql` and `20260215120000_taxonomy_multicategory_indexes.sql`:

1. Created `topics`, `question_topics`, `topic_edges` tables.
2. Added `preparation_category_id` to topics.
3. Backfilled topic–category mapping from legacy data.

### Phase B: Enforce Integrity ✅

Delivered in `20260215170000_enforce_published_questions_have_topics.sql` and `20260216140000_phase1_features_schema.sql`:

1. Guardrail: published questions must have at least one linked topic.
2. Data integrity constraints added across categories, topics, questions, answers.
3. `preparation_category_id` dropped, replaced by `subcategory_id`.

### Phase C: Cleanup & New Features ✅

Delivered in `20260215210000_drop_question_tags.sql`, `20260215213000_drop_question_difficulty_and_read_time.sql`, `20260215214500_drop_user_preferred_difficulty_and_enum.sql`, and `20260216140000_phase1_features_schema.sql`:

1. Dropped legacy columns: `tags`, `difficulty`, `estimated_minutes`, `preferred_difficulty`.
2. Added `question_type` and `seniority_level` to questions.
3. Added subcategories table and `topics.subcategory_id`.
4. Added playlists system (tables, RLS, triggers).
5. Added spaced repetition columns to progress tables.

## LLM-Assisted Ingestion Strategy

### Workflow

1. Collect raw question text (no auto-publish).
2. Run dedup check using `content/templates/catalog-dedup-check.md`.
3. Use LLM to propose unique topics via `content/templates/topic-seed.md`.
4. Human review and approve topic set.
5. Generate topic graph edges via `content/templates/topic-edges-generation.md`.
6. Use LLM to generate questions via `content/templates/question-generation.md`.
7. Generate answers using the appropriate template (`standard-answer.md`, `scenario-answer.md`, `code-review-answer.md`).
8. Human review all output before canonical writes.

### Review Requirement

Human approval is mandatory before canonical writes. See `content/templates/README.md` for the full required workflow.

### Proposed Staging Tables

1. `ingest_batches`
2. `ingest_raw_questions`
3. `ingest_topic_candidates`
4. `ingest_question_topic_suggestions`
5. `ingest_review_decisions`

See `docs/SCHEMA_DIAGRAM.md` for the staging ER diagram.

## Quality and Safety Rules

1. Preserve audit trail for each review decision.
2. Store confidence and source metadata for each LLM suggestion.
3. Keep dedupe checks before promotion to canonical tables.
4. Keep RLS strict: staging tables should not be publicly readable.

## Paywall Future Scope

Paywall is intentionally deferred. Playlists schema includes `access_level` (free/preview/paid) for future entitlement models, but no paywall logic is implemented.

## Acceptance Criteria

1. ~~No schema ambiguity between Preparation Category and Topic semantics.~~ ✅
2. ~~Questions discoverable under one or many categories via linked topics.~~ ✅
3. ~~Existing learner routes continue to work after migration.~~ ✅
4. Ingestion path supports high-volume raw input with human review gate. (Planned)
