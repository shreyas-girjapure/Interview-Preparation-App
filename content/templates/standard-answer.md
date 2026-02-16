# Standard Answer Template

You are an expert Salesforce developer and interview coach with 8+ years of experience. Generate a comprehensive interview answer following this EXACT structure.

## Input Variables

- `{QUESTION_TITLE}` — The interview question
- `{TOPIC}` — The topic this question belongs to (e.g., "Apex Triggers")
- `{SENIORITY}` — Target seniority level: junior | mid | senior | lead | architect
- `{SUBCATEGORY}` — The broader grouping (e.g., "Apex Programming")

## Prompt

```
You are a Salesforce interview coach with 8+ years of hands-on experience. Write a detailed, expert-level answer for the following interview question.

**Question:** {QUESTION_TITLE}
**Topic:** {TOPIC}
**Seniority Level:** {SENIORITY}
**Category:** {SUBCATEGORY}

Write the answer in markdown using EXACTLY this heading structure. Do NOT skip any section. Do NOT add extra top-level headings.

---

## Key Points

- 3 to 5 bullet points that directly answer the question
- Each bullet should be a concise, standalone fact
- Order from most important to least important

## Detailed Explanation

Write 2-4 paragraphs explaining the concept in depth. Cover:
- What it is and why it matters
- How it works under the hood (appropriate to the seniority level)
- When to use it vs. alternatives
- Real-world context from production Salesforce orgs

## Example

```apex
// Provide a realistic, production-quality code example
// Include comments explaining key decisions
// Keep it concise but complete (10-30 lines)
```

Explain what the example demonstrates and any important details.

## Best Practices

- 3 to 5 actionable best practices
- Each should be specific to this topic, not generic advice
- Include the "why" behind each practice

> [!TIP]
> Include one interview-specific tip: what interviewers are really looking for when they ask this question, or how to frame your answer to stand out.

## Common Mistakes

- 2 to 4 common mistakes developers make
- For each: what the mistake is, why it happens, and the correct approach
- Focus on mistakes relevant to the {SENIORITY} level

---

**Seniority calibration guidelines:**
- **Junior:** Focus on fundamentals, syntax, basic use cases. Keep examples simple.
- **Mid:** Include practical trade-offs, real-world patterns, moderate complexity.
- **Senior:** Cover edge cases, performance implications, architecture decisions, governor limits.
- **Lead:** Add team-level considerations, code review perspectives, org-wide impact.
- **Architect:** Multi-cloud thinking, enterprise patterns, scalability, long-term maintainability.
```

## Output Rules

1. Use ONLY the headings shown above — the frontend parses them for rendering
2. Code blocks must specify language (`apex`, `javascript`, `soql`, `html`, etc.)
3. Use `> [!TIP]` for interview tips (rendered as green callout)
4. Use `> [!CAUTION]` for governor limit warnings or production risks (rendered as red callout)
5. Use `> [!NOTE]` for additional context (rendered as blue callout)
6. Keep total length between 400–800 words (excluding code blocks)
7. Never use first person ("I"). Use second person ("you") or neutral voice
8. Tables are encouraged for comparisons
