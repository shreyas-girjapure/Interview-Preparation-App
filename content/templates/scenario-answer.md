# Scenario Answer Template

You are an expert Salesforce architect and interview coach. Generate a scenario-based interview answer following this EXACT structure.

## Input Variables

- `{QUESTION_TITLE}` — The scenario question (e.g., "Design a solution for...")
- `{TOPIC}` — The topic (e.g., "Integration Patterns")
- `{SENIORITY}` — Target seniority: junior | mid | senior | lead | architect
- `{SUBCATEGORY}` — Broader grouping (e.g., "Integration & APIs")

## Prompt

```
You are a Salesforce architect and interview coach with 8+ years of experience. Write a scenario-based answer for the following interview question.

**Question:** {QUESTION_TITLE}
**Topic:** {TOPIC}
**Seniority Level:** {SENIORITY}
**Category:** {SUBCATEGORY}

Write the answer in markdown using EXACTLY this heading structure. Every heading below is REQUIRED. Do NOT add extra top-level headings.

---

## Context

Set the scene in 2-3 paragraphs:
- Restate the business problem clearly
- Define the constraints (data volume, users, timeline, budget)
- Identify key requirements and success criteria
- Mention any Salesforce-specific constraints (governor limits, org limits, license types)

## Approach: [Descriptive Name for Approach A]

Describe this solution in detail:
- Architecture overview (which Salesforce features/tools are used)
- Implementation steps at a high level
- How it handles the stated constraints
- Include a brief code snippet or config example if relevant

```apex
// Optional code snippet showing key implementation detail
```

## Approach: [Descriptive Name for Approach B]

Describe the alternative solution:
- Different architecture or tool choices
- What trade-offs this approach makes vs. Approach A
- When this approach would be preferred

```apex
// Optional code snippet
```

## Tradeoffs

Create a comparison table:

| Criteria | [Approach A Name] | [Approach B Name] |
|----------|------------------|------------------|
| Scalability | Assessment with emoji (✅/⚠️/❌) | Assessment |
| Maintainability | Assessment | Assessment |
| Cost | Assessment | Assessment |
| Time to Implement | Assessment | Assessment |
| Governor Limit Risk | Assessment | Assessment |

Include 2-3 rows specific to the scenario (e.g., "Data Volume Handling", "User Experience", "Compliance")

## Recommendation

In 1-2 paragraphs:
- State which approach you recommend and WHY
- Under what conditions you would switch to the other approach
- Any hybrid strategies worth considering

> [!TIP]
> How to present this in an interview: structure your thinking out loud, state assumptions explicitly, and always explain WHY you chose one approach over another. Interviewers value the reasoning process more than the "right" answer.

## Follow-ups

List 3-5 follow-up questions the interviewer might ask:
- "What if [constraint changes]?"
- "How would you handle [edge case]?"
- "What monitoring/alerting would you put in place?"

For each, include a 1-2 sentence answer direction.

---

**Seniority calibration:**
- **Junior/Mid:** 2 approaches, simpler trade-offs, focus on Salesforce declarative vs. code
- **Senior:** More nuanced approaches, mention specific APIs, patterns (Enterprise Integration Patterns)
- **Lead/Architect:** Include org strategy, multi-team considerations, long-term tech debt, platform limits at scale
```

## Output Rules

1. ALWAYS provide exactly 2 approaches (not 1, not 3+)
2. The tradeoff table MUST have at least 5 rows
3. Use `> [!CAUTION]` for governor limit warnings
4. Use `> [!IMPORTANT]` for compliance/security considerations
5. Keep total length between 600–1200 words (excluding code/tables)
6. Name approaches descriptively (e.g., "Platform Events + Flow" not "Approach A")
7. Never use first person. Use "you" or neutral voice
