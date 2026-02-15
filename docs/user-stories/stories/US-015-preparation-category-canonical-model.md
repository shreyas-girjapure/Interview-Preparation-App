# US-015 - Preparation Category Canonical Model

## Epic

- EPIC-F Preparation Category Taxonomy and LLM Intake

## Story

As a platform maintainer, I want categories repurposed as canonical Preparation Categories, so that taxonomy is consistent across schema, ingestion, and querying.

## Acceptance Criteria

1. `categories` is treated as the Preparation Category source of truth.
2. `topics` has canonical `preparation_category_id` linkage.
3. `questions` category membership is derived through linked topics, not a direct required category FK.
4. Backfill completes without null canonical category for existing published topics.

## Status

- Implemented (taxonomy migration baseline)
