# EPIC-F - Preparation Category Taxonomy and LLM Intake

## Goal

Establish a canonical backend taxonomy and a scalable, review-gated ingestion path for large question corpora.

## Status

- Draft backlog (pre-implementation)

## In Scope

- Canonical Preparation Category modeling
- Topic-to-category ownership rules
- Question-topic-category integrity enforcement
- LLM-assisted topic extraction and question tagging with human review
- Promotion workflow from staging to canonical tables

## Stories

- US-015 Preparation Category Canonical Model (`docs/user-stories/stories/US-015-preparation-category-canonical-model.md`)
- US-016 Question-Topic Category Integrity (`docs/user-stories/stories/US-016-question-topic-category-integrity.md`)
- US-017 Query Compatibility During Taxonomy Migration (`docs/user-stories/stories/US-017-query-compatibility-taxonomy-migration.md`)
- US-018 LLM Topic Candidate Review Workflow (`docs/user-stories/stories/US-018-llm-topic-candidate-review-workflow.md`)
- US-019 LLM Question Topic Tagging Review Workflow (`docs/user-stories/stories/US-019-llm-question-topic-tagging-review-workflow.md`)
- US-020 Canonical Promotion and Quality Audit (`docs/user-stories/stories/US-020-canonical-promotion-quality-audit.md`)

## Epic Exit Criteria

- Preparation Category, Topic, and Question semantics are unambiguous in schema and docs.
- Topic ownership to a single Preparation Category is enforced.
- Question discovery supports one or many categories via topic links.
- LLM-assisted ingestion operates with mandatory human approval before canonical promotion.
