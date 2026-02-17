# Question Generation Template

Generate interview questions for a specific topic. Used to batch-create questions before generating answers.

## Input Variables

- `{TOPIC}` — The specific topic (e.g., "Apex Triggers")
- `{SUBCATEGORY}` — Broader grouping (e.g., "Apex Programming")
- `{CATEGORY}` — Top-level category (e.g., "Salesforce")

## Prompt

```
You are a Salesforce interview coach. Generate interview questions for the topic below.

**Topic:** {TOPIC}
**Subcategory:** {SUBCATEGORY}
**Category:** {CATEGORY}

Generate questions as a JSON array. For EACH question, provide:

[
  {
    "title": "The interview question as asked to the candidate",
    "slug": "kebab-case-url-slug-max-60-chars",
    "summary": "One sentence describing what this question tests",
    "question_type": "standard | scenario | code_review",
    "seniority_level": "junior | mid | senior | lead | architect"
  }
]

**Distribution rules:**
- Generate 6 questions per topic:
  - 3 standard (1 junior, 1 mid, 1 senior)
  - 2 scenario (1 senior, 1 architect)
  - 1 code_review (1 mid or senior)

**Question quality rules:**
- Standard: start with "What", "How", "Explain", "Compare", "When"
- Scenario: start with "Design", "You need to", "A client requires", "Your org has"
- Code review: start with "Review this", "What issues exist in", "Identify problems in"
- Avoid yes/no questions
- Each question should test a DISTINCT concept within the topic
- Slugs must be unique, descriptive, URL-safe, and must NOT include seniority level
- Summary should mention the specific concept being tested
```

## Output Rules

1. Output MUST be valid JSON — no markdown wrapping
2. Exactly 6 questions per topic
3. Slugs follow pattern: `{topic-slug}-{concept}` (e.g., `apex-triggers-bulkification`)
4. No duplicate concepts within a topic
5. Questions should cover the most interview-relevant aspects of the topic
