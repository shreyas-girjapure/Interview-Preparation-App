# US-016 - Question-Topic Category Integrity

## Epic

- EPIC-F Preparation Category Taxonomy and LLM Intake

## Story

As a platform maintainer, I want DB-level integrity rules for question-topic mappings, so that topic ownership stays valid while questions can span one or many Preparation Categories.

## Acceptance Criteria

1. A topic can belong to exactly one Preparation Category.
2. A question can be linked to topics across multiple Preparation Categories.
3. Publishing is blocked when a question has no linked topics.
4. Integrity checks run successfully on existing data before constraints become strict.

## Status

- Implemented (integrity constraints + publish guardrail baseline)
