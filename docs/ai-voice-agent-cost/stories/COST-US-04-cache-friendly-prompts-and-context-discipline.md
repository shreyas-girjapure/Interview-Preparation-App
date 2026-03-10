# COST-US-04: Cache-Friendly Prompts and Context Discipline

## Story

As the app owner, I need the live voice session to preserve cache-friendly
context and avoid needless prompt growth so token cost does not climb faster
than session value.

## Status

- `Status`: Draft
- `Why this exists`: OpenAI's Realtime cost guidance explicitly says lower
  token windows control cost, while frequent truncation can hurt cache reuse.

## Acceptance Criteria

1. The session prompt has a stable prefix that does not change unnecessarily
   between similar sessions.
2. Scope snapshots are capped so large playlists or search metadata do not
   balloon instructions.
3. The Realtime session uses an explicit truncation policy instead of relying
   on unbounded context growth.
4. We can explain how the chosen prompt and truncation strategy affects both
   cost and cache hit rate.

## Low-Level Direction

- Move prompt assembly toward:
  - stable system prefix
  - compact scope-specific payload
  - bounded dynamic additions
- Use prompt templates or shared prompt builders where they improve stability.
- Add explicit truncation policy and retention ratio tuning after evaluating
  how much memory loss is acceptable for interviews.
- Keep search citations and transcript persistence metadata out of the stable
  prompt prefix unless the model truly needs them.

## Best Practices

- Treat prompt bytes as spend, not just implementation detail.
- Stable prefixes help caches; random or noisy prefixes waste money.
- Large context is not automatically better interview quality.

## Dependencies

- Should follow `COST-US-01`.
