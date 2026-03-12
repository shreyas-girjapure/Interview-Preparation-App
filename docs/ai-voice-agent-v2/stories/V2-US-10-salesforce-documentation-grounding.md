# V2-US-10: Salesforce Pre-Session Documentation Grounding for Voice Agent

## Story

As a learner practicing Salesforce interview questions, I want the AI voice
agent to start each interview session with fresh context from official
Salesforce documentation, release notes, and recent platform changes so that
answers are more accurate, more specific, and less reliant on stale model-only
knowledge.

## Status

- `Status`: Done
- `Shipped`: The narrowed first pass shipped on 2026-03-12 with one official
  Salesforce startup-grounding warmup shared by both runtime lanes.
- `Why this exists`: currently, the AI voice agent does not perform enough
  Salesforce-specific grounding, so answers can miss recent releases, updated
  terminology, or the exact wording and constraints used in official docs.
- `Current baseline`: citation rendering and citation persistence already
  existed before this story, but learner-facing citations and live per-turn
  search were intentionally kept out of the first grounding slice. The shipped
  behavior now uses one server-owned startup brief and keeps live browsing off
  during the round.
- `Current implementation approach`: this story now ships a dedicated
  Salesforce documentation warmup during session startup. The server fetches a
  compact internal briefing about recent changes, release notes, and
  topic-specific documentation, then injects that briefing into the interview
  context before the session begins. The same startup brief is reused by both
  the chained runtime and the Realtime bootstrap path.
- `Deferred follow-on`: per-turn scoped search, user-visible citation UX, and a
  future Salesforce MCP-backed provider remain out of scope for this first
  implementation.
- `Closure note`: this first pass remains intentionally simple. It preloads
  fresher Salesforce context once at startup, not a full browsing workflow
  inside the live conversation.

### Implemented now (2026-03-12)

- Added `scoped-documentation-search.ts` as the server-owned startup warmup
  module, with Salesforce-scope detection, deterministic topic-derived query
  planning, official-domain restriction, strict timeout handling, in-memory
  cache, and stale fallback behavior.
- Tuned the startup grounding lane to use `gpt-5.4` by default with a larger
  structured-output token budget so startup briefs carry more complete recent
  facts before the session begins.
- Simplified the startup search query and raised the default grounding timeout
  so cold-start sessions are less likely to miss grounding just because the
  official-doc search took longer than `3.5s`.
- Kept the structured grounding brief intentionally compact with low-verbosity
  output so the one-shot startup search stays more reliable and faster on cold
  sessions instead of spending extra time generating unnecessary prose.
- Extended topic scope metadata so Salesforce interview scopes can opt into the
  grounding path without enabling the same behavior for unrelated topics.
- Wired the grounding warmup into `POST /api/interview/sessions` so startup
  runs the warmup once per session, persists grounding diagnostics, exposes
  grounding timing, and injects the resulting brief into both runtime
  bootstraps.
- Reused the same brief inside the chained runtime for the opening turn and
  later server-owned text generation, and inside the Realtime bootstrap for the
  initial instructions before client-secret creation.
- Fixed the grounded Realtime duplicate-opener edge by keeping VAD enabled
  while moving response creation fully to explicit client triggers on session
  start and committed learner turns.
- Added a speculative authenticated prewarm endpoint plus `Mock Interview`
  click wiring so many session starts can land on a hot cache without blocking
  navigation.
- Updated status copy and prompt framing so the product no longer claims the
  feature is missing, while still clearly keeping live browsing off during the
  active round.
- Added route, prompt, runtime, environment, and grounding-module tests, with
  lint, test, and build verification passing on the implementation branch.

### Done Notes

- Learner-facing citation UX is still not part of this story's shipped scope.
- Per-turn scoped search remains a separate follow-on in `V2-US-01`.
- Search safety, prompt-injection, and exfiltration hardening remain the
  release gate tracked in `V2-US-02`.
- Session diagnostics now persist structured grounding failure details so a
  fallback session can be debugged without reproducing the original bootstrap
  error blindly.

## Acceptance Criteria

1. When a new interview session starts for a Salesforce topic, the server runs
   one lightweight grounding warmup against official Salesforce sources such as
   Salesforce Developers, Help, or release-note pages.
2. The warmup gathers recent changes, release context, and topic-relevant
   official documentation details using a compact Salesforce-specific query.
3. The warmup is summarized into a small internal grounding brief before the
   interview begins.
4. The chained voice runtime uses that grounding brief for the opening turn and
   subsequent server-owned turn generation.
5. The Realtime bootstrap path also uses the same grounding brief by injecting
   it into the initial session instructions before the browser connects.
6. The assistant does not mention citations, search steps, or documentation
   lookups unless the user explicitly asks.
7. If the warmup fails, times out, or yields weak evidence, the session still
   starts with the normal scoped interview prompt and does not invent recency
   claims.
8. The warmup runs once per session start and is reused for the rest of that
   session instead of triggering repeated documentation calls during the live
   conversation.
9. The startup path uses cache-first and timeout-bounded behavior so grounding
   improves accuracy without materially slowing connection time.
10. The app may start a speculative server-side prewarm when the learner clicks
    the mock interview entry point, but that prewarm must not block navigation
    or session start.

## Low-Level Solution Design

- Add a server-owned warmup module, for example
  `src/lib/interview/scoped-documentation-search.ts`, but scope it to a simple
  startup briefing rather than a general live-search workflow.
- Detect Salesforce scope from the session topic metadata and enforce official
  Salesforce domains such as `developer.salesforce.com`, `help.salesforce.com`,
  and release-note documentation pages.
- Build one compact startup query from the topic title, known Salesforce terms,
  and a recent-changes or release-notes bias.
- Normalize the results into an internal `groundingBrief` shape such as:
  `recentChanges`, `releaseNotes`, `topicFacts`, and `retrievedAt`.
- Inject that brief into the chained runtime prompt path before generating the
  opening turn and later server-owned turns.
- Inject that same brief into the Realtime bootstrap prompt before creating the
  client secret so the first Realtime turn already starts with fresher context.
- Keep the model instructions focused on using the briefing internally. Do not
  require the assistant to mention citations or announce that it searched.
- Add bounded timeout and fallback handling so session startup does not become
  fragile.
- Keep the warmup provider behind a small abstraction so the same contract can
  later be reused for Realtime bootstrap or swapped to a future MCP source.
- Add a speculative prewarm entry point that the app can call when the learner
  clicks `Mock Interview`. That entry point should ask the server to begin
  preparing the grounding brief in the background without blocking route
  transition or microphone setup.

## Startup Timing And Latency Strategy

- Start a speculative server-side prewarm on `Mock Interview` button click.
  This should be best-effort only and must not block UI navigation.
- The button-click prewarm should populate the same cache used by the real
  session bootstrap path rather than creating a second source of truth.
- Make the grounding network call during server-side session bootstrap, not in
  the browser and not after the first turn has already started.
- The call should begin only after scope resolution and one-live-session policy
  checks confirm that the session can actually proceed.
- For Salesforce scopes, use this bootstrap order:
  auth -> scope resolve -> live-session guard -> create local session record ->
  read grounding cache -> if needed run official-doc warmup with strict timeout
  -> build runtime bootstrap using the resulting brief or fallback prompt.
- Reuse the same grounding brief for the entire session so the app never pays
  repeated search latency on every turn.
- Prefer a cache-first approach keyed by `scopeSlug` plus a freshness window.
  If a fresh brief exists, use it immediately.
- If the learner clicked `Mock Interview` shortly before session creation, the
  bootstrap path should usually hit that prewarmed cache instead of paying the
  full cold-start cost.
- If a stale brief exists, it can still be used as a fallback rather than
  blocking startup on a slower fresh fetch.
- If no usable brief is available quickly, continue startup with the normal
  scoped prompt rather than holding the connection open too long.
- Keep the warmup query deterministic and topic-derived so there is no extra
  model planning call before search.
- Keep the fetch narrow:
  one Salesforce-focused query, a small number of official results, and a small
  summarized brief.
- Run non-dependent bootstrap work in parallel where possible. Example:
  profile sync and grounding warmup can overlap after the scope is known.

## Best Practices

- Keep the startup briefing small and dense so it improves accuracy without
  bloating the prompt.
- Do not block session startup for too long; use aggressive timeouts and a safe
  fallback to normal scoped behavior.
- Keep this first pass pre-session only; do not expand into per-turn browsing
  yet.
- Avoid generic web results. Restrict to known Salesforce official domains.
- Use the grounding internally. Do not make citation display or search
  narration part of the learner experience in this story.
- Prefer a cached brief over a slow fresh brief when startup latency would
  otherwise become noticeable.
- Use the same precomputed brief for both chained and Realtime so behavior is
  consistent across runtime lanes.
- Treat button-click prewarm as an optimization, not a requirement. The actual
  session bootstrap must still work correctly if the prewarm never ran or did
  not finish in time.

## Dependencies

- Reuses the early search-orchestration direction from `V2-US-01`, but this
  story is intentionally narrower than the full per-turn scoped-search design.
- Can use existing transcript and persistence primitives if implementation wants
  to store debug metadata, but learner-facing citation UX is not required.

## Recommended First Implementation

1. Add Salesforce-aware startup brief generation with official-domain
   restriction and strict timeout.
2. Add cache-first lookup by `scopeSlug` so repeated session starts avoid the
   full warmup cost.
3. Add speculative server-side prewarm on `Mock Interview` click so many
   session starts land on a hot cache.
4. Feed the brief into the chained opening-turn and turn-generation prompt
   path.
5. Feed the same brief into the Realtime bootstrap instructions before session
   creation.
6. Fall back cleanly to the normal scoped prompt when the brief is missing,
   stale beyond policy, or too slow to compute.
