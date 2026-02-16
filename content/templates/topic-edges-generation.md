# Topic Edge Generation Template

Generate candidate `topic_edges` records as JSON only. These are suggestions, not final truth.

Deterministic validation and upsert logic decides what is persisted.

## Input Variables

- `{FROM_TOPIC_NAME}` - Canonical topic name (e.g., "Apex Triggers")
- `{FROM_TOPIC_SLUG}` - Canonical topic slug (e.g., "apex-triggers")
- `{FROM_SUBCATEGORY}` - Parent subcategory of the source topic
- `{FROM_TOPIC_OVERVIEW}` - Final overview markdown (without manual prereq/related sections)
- `{CANDIDATE_TOPICS_JSON}` - JSON array of candidate topics

Candidate topic object shape:

```json
{
  "slug": "apex-fundamentals",
  "name": "Apex Fundamentals",
  "short_description": "Variables, collections, data types, null handling, control flow",
  "subcategory": "Apex Programming"
}
```

## Prompt

```
You are generating topic graph edge suggestions for an interview prep app.
Your output MUST be valid JSON only (no markdown, no prose outside JSON).

Source topic:
- name: {FROM_TOPIC_NAME}
- slug: {FROM_TOPIC_SLUG}
- subcategory: {FROM_SUBCATEGORY}

Source overview:
{FROM_TOPIC_OVERVIEW}

Candidate topics:
{CANDIDATE_TOPICS_JSON}

Output format:
{
  "from_topic_slug": "{FROM_TOPIC_SLUG}",
  "candidate_edges": [
    {
      "to_topic_slug": "topic-slug",
      "relation_type": "prerequisite" | "related" | "deep_dive",
      "confidence": 0.0,
      "reason": "one short sentence"
    }
  ]
}
```

## Output Rules

1. Output valid JSON only. No code fences.
2. Do not include self-links (`to_topic_slug` cannot equal `{FROM_TOPIC_SLUG}`).
3. Do not duplicate the same `(to_topic_slug, relation_type)` pair.
4. Suggest at most:
- `prerequisite`: 3
- `related`: 4
- `deep_dive`: 2
5. Prefer `prerequisite` edges for foundational concepts that should be learned first.
6. Prefer `deep_dive` for advanced follow-up study, not basics.
7. If confidence is below `0.65`, omit the edge.
8. Do not invent topics outside `{CANDIDATE_TOPICS_JSON}`.
9. Keep `reason` concise and specific to interview study flow.

## Deterministic Gate Reminder

Your output is advisory only. The importer/validator will enforce:
- existing slugs only
- no self loops
- cycle checks for prerequisite edges
- duplicate removal
- limit caps
- canonical sort order assignment

