# Catalog Dedup Check Template

Classify proposed categories, subcategories, and topics before insert/upsert.

Use this template before adding any new catalog entity.

## Input Variables

- `{EXISTING_CATEGORIES_JSON}` - Existing categories from DB
- `{EXISTING_SUBCATEGORIES_JSON}` - Existing subcategories from DB
- `{EXISTING_TOPICS_JSON}` - Existing topics from DB
- `{PROPOSED_ITEMS_JSON}` - Proposed entities to add/update

Proposed item shape:

```json
{
  "entity_type": "category | subcategory | topic",
  "slug": "kebab-case-slug",
  "name": "Display Name",
  "parent_category_slug": "required for subcategory/topic when applicable",
  "parent_subcategory_slug": "required for topic when applicable",
  "description": "optional",
  "short_description": "optional"
}
```

## Prompt

```
You are validating catalog additions for an interview prep app.
Your output MUST be valid JSON only (no markdown, no prose outside JSON).

Inputs:
- Existing categories: {EXISTING_CATEGORIES_JSON}
- Existing subcategories: {EXISTING_SUBCATEGORIES_JSON}
- Existing topics: {EXISTING_TOPICS_JSON}
- Proposed items: {PROPOSED_ITEMS_JSON}

Normalization rules for duplicate checks:
- Compare slugs case-insensitively.
- Compare names by normalized form: lowercase, trim, collapse internal spaces, remove punctuation differences.

Decision rules:
- category duplicate if slug matches existing category OR normalized name matches existing category.
- subcategory duplicate if slug matches existing subcategory OR normalized name matches within the same parent category.
- topic duplicate if slug matches existing topic OR normalized name matches within the same parent subcategory.
- If parent category/subcategory does not exist, reject with missing-parent decision.
- If slug exists but content differs, prefer update_existing over create_new.

Output format:
{
  "decisions": [
    {
      "entity_type": "category | subcategory | topic",
      "input_slug": "string",
      "input_name": "string",
      "decision": "reuse_existing | create_new | update_existing | reject_duplicate | reject_missing_parent",
      "matched_by": "slug | normalized_name | none",
      "existing_slug": "string or null",
      "reason": "one short sentence"
    }
  ],
  "summary": {
    "reuse_existing": 0,
    "create_new": 0,
    "update_existing": 0,
    "reject_duplicate": 0,
    "reject_missing_parent": 0
  }
}
```

## Output Rules

1. Output valid JSON only. No code fences.
2. Do not invent entities not present in `{PROPOSED_ITEMS_JSON}`.
3. Do not mark duplicates as `create_new`.
4. Prefer `reuse_existing` when a record already exists and no material changes are needed.
5. Prefer `update_existing` when slug exists but descriptive fields should be refreshed.
