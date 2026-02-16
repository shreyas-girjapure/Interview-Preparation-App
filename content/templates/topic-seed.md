# Topic Seed Template

Generate structured topic data for the database. Each topic needs a `short_description` and a rich `overview_markdown` that serves as the topic landing page content.

## Input Variables

- `{TOPIC_NAME}` - Topic name (e.g., "Apex Triggers")
- `{TOPIC_SLUG}` - URL slug (e.g., "apex-triggers")
- `{SUBCATEGORY}` - Parent subcategory (e.g., "Apex Programming")
- `{SENIORITY_RANGE}` - Target range (e.g., "junior to senior")
- `{SHORT_DESCRIPTION}` - Existing one-line description from seed plan

## Prompt

```
You are a Salesforce expert creating content for an interview preparation platform. Generate a topic overview for the landing page.

**Topic:** {TOPIC_NAME}
**Subcategory:** {SUBCATEGORY}
**Seniority Range:** {SENIORITY_RANGE}
**Short Description:** {SHORT_DESCRIPTION}

Write the `overview_markdown` using EXACTLY this structure:

---

## Why This Matters in Interviews

2-3 sentences on why interviewers ask about this topic and how frequently it comes up. Be specific and mention which rounds (technical, system design, live coding) typically cover this.

## What You Need to Know

A structured breakdown of the topic key areas. Use a mix of prose and bullet points:

### Core Concepts
- Concept 1: one-line explanation
- Concept 2: one-line explanation
- (4-6 concepts, ordered from fundamental to advanced)

### Key Differences to Know
| A | B | Key Difference |
|---|---|---|
| (include 2-3 comparison rows relevant to the topic) |

### Common Interview Scenarios
- Scenario 1: brief description of a typical interview situation
- Scenario 2: brief description
- (3-4 scenarios)

---
```

## Output Rules

1. Keep `overview_markdown` between 300-500 words.
2. Use EXACTLY the headings shown.
3. Do NOT include actual interview questions (those live in the questions table).
4. Focus on WHAT to study, not the answers themselves.
5. Be specific to Salesforce - no generic programming advice.
6. Do not include manual prerequisite/related topic sections; those are computed deterministically from structured data.
7. Do not propose topic edges inside markdown. Use `topic-edges-generation.md` for graph suggestions.
8. Before adding a new topic, run `catalog-dedup-check.md`; only create topics classified as `create_new` or `update_existing`.
9. If a matching topic exists by slug or normalized name in the same subcategory, reuse/update that topic instead of creating a duplicate.
