# V2-US-01: Scoped Documentation Search Orchestration

## Story

As a learner, I want the interview coach to use a tightly scoped official-doc
grounding path for the active interview topic so answers stay current and
bounded instead of drifting into broad browsing.

## Status

- `Status`: Done
- `Shipped`: The narrowed first pass shipped on 2026-03-12 as a server-owned
  startup grounding path for Salesforce interview scopes.
- `Why this exists`: V1 intentionally shipped with live search disabled even
  though the prompt and UI shape already anticipated a scoped
  documentation-backed answer path.
- `Current implementation approach`: this story is now closed as the
  pre-session orchestration layer behind `V2-US-10`, not as a per-turn live
  search workflow. The server resolves scope, builds one deterministic
  official-doc query, fetches a compact grounding brief behind a narrow
  boundary, and reuses that brief for the session.
- `Deferred follow-on`: if the product later needs explicit turn-time
  documentation lookups, cross-ecosystem source resolution, or learner-visible
  search citations, treat that as a new follow-on rather than unfinished scope
  inside this story.
- `Closure note`: no per-turn search trigger, no broad browsing mode, and no
  search-specific transcript citations are part of the closed scope.

### Implemented now (2026-03-12)

- Added `src/lib/interview/scoped-documentation-search.ts` as the server-owned
  orchestration layer for official-doc startup grounding.
- Search remains outside the main interviewer runtime. The core coach never
  receives unrestricted browsing access.
- Query construction is server-owned and deterministic from the scoped topic
  snapshot rather than browser-authored free-form search input.
- The first shipped source policy is intentionally narrow:
  official Salesforce domains only, with one lightweight search-backed warmup
  per applicable session start.
- Search results are normalized into a compact internal grounding brief instead
  of being injected as raw provider output.
- The startup brief is reused by both the chained runtime and the Realtime
  bootstrap path.
- Timeout-bounded behavior, cache-first reads, stale fallback, and speculative
  prewarm on `Mock Interview` intent are all part of the shipped orchestration.
- If the fetch fails, times out, or yields weak evidence, the session falls
  back to the normal scoped interview prompt without inventing recency claims.

### Done Notes

- This story now closes the orchestration layer for startup-scoped grounding
  only.
- Off-topic redirects remain prompt-driven in the main interviewer policy.
- Broader official-source mapping outside Salesforce is not part of the shipped
  closure.

## Acceptance Criteria

1. Documentation grounding happens only through a server-owned scoped path for
   the active interview session.
2. The main interviewer does not receive unrestricted browsing access.
3. Search query construction stays server-owned and derived from the active
   scope snapshot rather than browser-authored arbitrary text alone.
4. The initial shipped source policy prefers confidently known official
   documentation domains and does not broaden into generic browsing when
   evidence is weak.
5. A successful grounding fetch returns a compact internal brief for the voice
   flow rather than raw search payloads.
6. The same scoped brief can be reused across both runtime lanes.
7. If search fails, times out, or yields weak evidence, the user gets the
   normal bounded scoped interview behavior instead of an invented answer.

## Low-Level Solution Design

- Add a server-owned orchestrator in
  `src/lib/interview/scoped-documentation-search.ts`.
- Keep the main interviewer specialized for coaching and scope discipline.
  Route official-doc grounding through a dedicated server path instead of
  giving the live interviewer a broad web tool.
- Build the effective search query from scope metadata and a deterministic set
  of domain-specific expansion terms.
- Prefer confidently known official documentation sources in server policy.
- Normalize search outputs into a compact grounding brief shaped for prompt
  injection instead of transcript rendering.
- Add bounded upstream timeouts plus cache and stale fallback behavior so the
  orchestration improves accuracy without materially harming startup latency.
- Persist grounding diagnostics so QA can distinguish grounded sessions from
  normal scoped sessions later.

## Best Practices

- Treat documentation lookup as a narrow capability, not a general search mode.
- Keep query construction deterministic enough that QA can compare behavior
  across versions.
- Prefer a small number of strong official signals over broader noisy search.
- Keep the browser thin. Query policy and source policy stay server-owned.
- If source confidence is weak, fall back safely instead of stretching to a
  maybe-correct source.

## Required Testing

- Applicable Salesforce scopes trigger the startup grounding path.
- Non-applicable scopes skip the grounding fetch.
- Fresh cache hits avoid repeated grounding requests.
- Weak-evidence, timeout, and failure paths return bounded fallbacks.
- The resulting brief is threaded into both runtime lanes consistently.

## Dependencies

- Builds on the dual-runtime bootstrap and prompt plumbing shipped across
  `V2-US-08` and `V2-US-10`.
- Uses the first-pass safety controls documented in `V2-US-02`.
