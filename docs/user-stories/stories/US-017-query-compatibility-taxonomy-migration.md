# US-017 - Query Compatibility During Taxonomy Migration

## Epic

- EPIC-F Preparation Category Taxonomy and LLM Intake

## Story

As a developer, I want query-layer compatibility during taxonomy migration, so that learner-facing routes keep working while schema transitions to canonical fields.

## Acceptance Criteria

1. Question and topic list/detail queries derive category membership through `question_topics -> topics -> categories`.
2. Existing frontend route behavior remains unchanged (`/questions`, `/questions/[slug]`, `/topics`, `/topics/[slug]`).
3. Existing API response shapes stay backward compatible during migration.
4. Compatibility is validated with smoke checks after migration.

## Status

- Draft backlog (pre-implementation)
