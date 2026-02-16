# Content Generation Templates

Reusable AI prompt templates for generating structured interview content.

These templates are split into:
- deterministic content generation inputs (topics, questions, answers)
- graph suggestion inputs (`topic_edges`) that are validated before persistence

## Templates

| Template | Purpose | Output |
|----------|---------|--------|
| [catalog-dedup-check.md](./catalog-dedup-check.md) | Validate proposed categories/subcategories/topics before writes | JSON decisions (`reuse_existing`, `create_new`, `update_existing`, rejection states) |
| [subcategory-seed.md](./subcategory-seed.md) | Define subcategories within a category | JSON plus ready-to-use seed data |
| [topic-seed.md](./topic-seed.md) | Generate topic landing-page markdown | `overview_markdown` only |
| [topic-edges-generation.md](./topic-edges-generation.md) | Suggest topic graph edges | JSON candidate edges (`prerequisite`, `related`, `deep_dive`) |
| [question-generation.md](./question-generation.md) | Batch-generate questions for a topic | JSON array of 6 questions |
| [standard-answer.md](./standard-answer.md) | Standard Q&A interview answers | `Key Points -> Detailed Explanation -> Example -> Best Practices -> Common Mistakes` |
| [scenario-answer.md](./scenario-answer.md) | Architecture/design scenario answers | `Context -> Approach x2 -> Tradeoffs -> Recommendation -> Follow-ups` |
| [code-review-answer.md](./code-review-answer.md) | Code review answers | `Code -> Issue x2-4 -> Corrected Version -> Review Summary` |

## Required Workflow

1. Run `catalog-dedup-check.md` against proposed category/subcategory/topic additions.
2. Only apply category/subcategory/topic inserts for items approved as `create_new` or `update_existing`.
3. Seed subcategories (`subcategory-seed.md`) with dedup-aware upsert behavior.
4. For each topic, generate `overview_markdown` with `topic-seed.md`.
5. For each topic, generate edge candidates with `topic-edges-generation.md`.
6. Run deterministic validation/import for edge candidates, then upsert `topic_edges`.
7. Generate questions (`question-generation.md`) and insert them.
8. Generate answers using the correct answer template and insert them.

## Important Rules

1. Prerequisites and related topics are not authored in topic markdown.
2. Topic graph relationships come from `topic_edges` only.
3. AI output for graph edges is suggestion-only and must pass deterministic validation.
4. Keep markdown and graph generation as separate steps.
5. Every category/subcategory/topic addition must pass dedup classification before any write.
