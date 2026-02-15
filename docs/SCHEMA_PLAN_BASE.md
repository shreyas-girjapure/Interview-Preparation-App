# Schema Plan Base: Preparation Category + Topic Graph

## Purpose

Define the canonical content taxonomy and ingestion flow before production scaling.

Reference diagram: `docs/SCHEMA_DIAGRAM.md`

## Current Problem

The current model has both `categories` and `topics`, which creates semantic overlap and confusion in operations and querying.

## Final Direction

Use this hierarchy:

1. Preparation Category (backend taxonomy layer, not primary frontend IA)
2. Topics (frontend learning navigation layer)
3. Questions (linked to one or more topics)

Each topic belongs to exactly one Preparation Category. Questions can link to
topics across multiple Preparation Categories.

## Canonical Decisions

1. Reuse `public.categories` as canonical Preparation Categories.
2. Each topic belongs to exactly one Preparation Category.
3. Each question can map to many topics, including topics from different Preparation Categories.
4. Question category membership is derived through `question_topics -> topics.preparation_category_id`.
5. Paywall implementation is deferred for now.

## Target Schema Shape

1. `categories`
   - Semantically treated as Preparation Categories.
2. `topics`
   - Canonical foreign key: `preparation_category_id` (migrated from legacy category linkage).
3. `questions`
   - No canonical category foreign key.
   - Category set is derived through linked topic records.
4. `question_topics`
   - Join table for many-to-many question-topic mapping.
   - Supports display ordering via `sort_order`.

## Migration Strategy

### Phase A: Additive and Safe

1. Add `topics.preparation_category_id` and backfill from current legacy mapping.
2. Keep `questions` independent of direct category foreign key.
3. Keep old fields temporarily for compatibility.

### Phase B: Enforce Integrity

1. Ensure `topics.preparation_category_id` is non-null and indexed.
2. Keep `question_topics` uniqueness and ordering constraints.
3. Block publish when question has no linked topics.

### Phase C: App Query Alignment

1. Update query layer to read canonical preparation category fields.
2. Keep current response shape stable for UI compatibility.
3. Remove deprecated single-category fields in a cleanup migration.

## LLM-Assisted Ingestion Strategy

### Workflow

1. Collect raw question text (no auto-publish).
2. Use LLM to propose unique topics first.
3. Human review and approve topic set.
4. Use LLM to map questions to approved topics only.
5. Human review mappings.
6. Promote approved items to canonical tables.

### Review Requirement

Human approval is mandatory before canonical writes.

## Proposed Staging Tables

1. `ingest_batches`
2. `ingest_raw_questions`
3. `ingest_topic_candidates`
4. `ingest_question_topic_suggestions`
5. `ingest_review_decisions`

## Quality and Safety Rules

1. Preserve audit trail for each review decision.
2. Store confidence and source metadata for each LLM suggestion.
3. Keep dedupe checks before promotion to canonical tables.
4. Keep RLS strict: staging tables should not be publicly readable.

## Paywall Future Scope

Paywall is intentionally deferred. Schema design should remain extensible for future entitlement models, but no paywall logic should be implemented in this phase.

## Acceptance Criteria

1. No schema ambiguity between Preparation Category and Topic semantics.
2. Questions can be discoverable under one or many Preparation Categories via linked topics.
3. Existing learner routes continue to work after migration.
4. Ingestion path supports high-volume raw input with human review gate.
