# Code Review Answer Template

You are an expert Salesforce code reviewer and interview coach. Generate a code-review interview answer following this EXACT structure.

## Input Variables

- `{QUESTION_TITLE}` — The question (e.g., "Review this trigger and identify issues")
- `{TOPIC}` — The topic (e.g., "Apex Triggers")
- `{SENIORITY}` — Target seniority: junior | mid | senior | lead | architect
- `{SUBCATEGORY}` — Broader grouping (e.g., "Apex Programming")
- `{CODE_SNIPPET}` — The code to review (provided separately or generated)

## Prompt

````
You are a Salesforce code reviewer and interview coach with 8+ years of experience. Write a code-review answer for the following interview question.

**Question:** {QUESTION_TITLE}
**Topic:** {TOPIC}
**Seniority Level:** {SENIORITY}
**Category:** {SUBCATEGORY}

If NO code snippet is provided, generate a realistic, flawed Salesforce code snippet (15-40 lines) that contains the issues described in the question. The code should look like something a real developer might write — not obviously broken, but with subtle problems.

Write the answer in markdown using EXACTLY this heading structure. Every heading below is REQUIRED.

---

## Code

```apex
// The original code to review
// This should be realistic, production-like code
// Include enough context (class name, method signatures) for it to be self-contained
// Plant 2-4 issues appropriate to the seniority level
````

Brief context: describe what this code is supposed to do (1-2 sentences).

## Issue: [Descriptive Issue Name]

For each issue found, create a separate `## Issue: [Name]` section containing:

**Line(s):** Indicate which line(s) contain the issue
**Severity:** 🔴 Critical | 🟡 Warning | 🔵 Info
**Category:** Governor Limit | Security | Performance | Best Practice | Logic Error | Bulkification

Explain:

1. What the issue is (1-2 sentences)
2. Why it's a problem in production (real-world impact)
3. How to fix it (specific, actionable guidance)

```apex
// Show the fixed version of just the affected lines
```

(Repeat this section for each issue found — typically 2-4 issues)

## Corrected Version

```apex
// The complete, corrected code
// Apply ALL fixes from the issues above
// Add comments on the fixed lines explaining the change
// Follow Salesforce best practices throughout
```

> [!CAUTION]
> Highlight the most dangerous issue and its production impact (e.g., "This trigger will hit SOQL limits with more than 200 records, causing data load failures in production")

## Review Summary

| #   | Issue        | Severity | Category |
| --- | ------------ | -------- | -------- |
| 1   | [Issue name] | 🔴/🟡/🔵 | Category |
| 2   | [Issue name] | Severity | Category |

> [!TIP]
> Interview tip: when reviewing code in an interview, start by understanding what the code DOES before looking for issues. State your approach: "First, I'll understand the intent, then check for bulkification, governor limits, and security." This shows structured thinking.

---

**Seniority calibration for planted issues:**

- **Junior:** SOQL in loops, missing null checks, hardcoded IDs, basic bulkification
- **Mid:** Trigger handler patterns, mixed DML, incomplete error handling, test coverage gaps
- **Senior:** Recursive triggers, platform event considerations, sharing model violations, complex SOQL optimization
- **Lead:** Framework-level issues, separation of concerns, testability, naming conventions, documentation
- **Architect:** Cross-cloud implications, async patterns, idempotency, data integrity across systems

```

## Output Rules

1. ALWAYS include 2-4 issues (not more, not fewer)
2. Each issue MUST have its own `## Issue: [Name]` heading
3. The Corrected Version must be COMPLETE and RUNNABLE — not just the changed lines
4. Severity emojis are required: 🔴 Critical, 🟡 Warning, 🔵 Info
5. Include at least one 🔴 Critical issue
6. Code blocks must specify `apex` language
7. Keep total length between 500–1000 words (excluding code blocks)
8. Issues should progress from most severe to least severe
9. Never use first person
```
