# Content Finalization Checklist

Last updated: 2026-02-17

## Goal

Finalize content templates so generated topic/question/answer output is:

- consistent for learners
- safe for import
- aligned with current schema and admin workflow
- reusable beyond Salesforce

## Finalization Checklist (Priority Order)

### 1) Contract Alignment

- [x] Decide canonical question contract for generation:
  - canonical mode keeps `question_type` and `seniority_level`
  - `admin_composer` mode returns `title`, `slug`, `summary` only for current `/api/admin/content-package` flow
- [x] Define canonical markdown section contracts for each answer type:
  - standard
  - scenario
  - code review
- [x] Set target reading-length budgets per answer type for web UX:
  - standard
  - scenario
  - code review
- [x] Decide domain strategy:
  - domain parameterization adopted via `{DOMAIN}` variables across templates

### 2) Template-by-Template Rewrite

- [x] `content/templates/question-generation.md`
  - remove ambiguity in distribution, slug format, and uniqueness expectations
  - align output fields with chosen persistence path
- [x] `content/templates/standard-answer.md`
  - reduce instruction conflict
  - keep section structure strong but practical
- [x] `content/templates/scenario-answer.md`
  - keep 2-approach format
  - tune length and table requirements for readability
- [x] `content/templates/code-review-answer.md`
  - clarify behavior when no snippet is provided
  - keep issue reporting format deterministic
- [x] `content/templates/topic-seed.md`
  - tighten overview scope and remove duplicate guidance
- [x] `content/templates/topic-edges-generation.md`
  - keep edge caps and confidence logic explicit
  - add clearer examples of good and bad edges
- [x] `content/templates/catalog-dedup-check.md`
  - add concrete normalization examples
  - keep decision states mutually exclusive
- [x] `content/templates/subcategory-seed.md`
  - choose one mode only:
    - static seed list, or
    - dynamic generation prompt
- [x] `content/templates/README.md`
  - reflect all revised contracts and execution order

### 3) Validation and QA

- [x] Add local JSON schema checks for JSON-output templates.
- [x] Add lightweight markdown section checks for answer templates.
- [ ] Create a small golden sample set (2 topics minimum) and evaluate:
  - structure compliance
  - factual quality
  - duplication rate
  - readability
- [x] Document pass/fail gates before import/publish.

### 4) Rollout

- [ ] Run one pilot batch end-to-end with revised templates.
- [ ] Record issues and patch templates once.
- [ ] Freeze v1 template set and tag in docs.

## One-by-One Execution Order

1. Finalize question contract and update `question-generation.md`.
2. Finalize `standard-answer.md`.
3. Finalize `scenario-answer.md`.
4. Finalize `code-review-answer.md`.
5. Finalize topic graph and dedup templates (`topic-seed`, `topic-edges-generation`, `catalog-dedup-check`).
6. Finalize `subcategory-seed.md`.
7. Update `content/templates/README.md`.
8. Run validation + pilot batch.

## Definition of Done (Per Template)

- Inputs are explicit and minimal.
- Output format is machine-checkable.
- No conflicting instructions.
- No encoding artifacts.
- At least one concrete example exists for expected output shape.
- Compatible with current schema and selected import path.
