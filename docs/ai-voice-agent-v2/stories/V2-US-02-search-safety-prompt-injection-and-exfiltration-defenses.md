# V2-US-02: Search Safety, Prompt Injection, and Exfiltration Defenses

## Story

As the app owner, I need the scoped grounding path to resist prompt injection
and accidental data exposure so official-doc freshness does not become a new
security hole.

## Status

- `Status`: Done
- `Shipped`: The narrowed first-pass hardening slice shipped on 2026-03-12 for
  the startup grounding flow.
- `Why this exists`: OpenAI's current docs explicitly warn that web search and
  search-like tool outputs can carry prompt-injection payloads, and that
  built-in model defenses are not sufficient on their own.
- `Current implementation approach`: this story now closes the minimum safety
  envelope around the shipped startup grounding path, not a broader live
  search stack. The active implementation keeps search on the server, restricts
  allowed domains, treats retrieved pages as untrusted, validates structured
  output before use, and never exposes raw web payloads to the learner-facing
  prompt or transcript in this slice.
- `Deferred follow-on`: if the product later adds turn-time search, broader
  source coverage, raw citation rendering, or more exposed web content, treat
  deeper sanitization, monitoring, and red-team coverage as a fresh follow-on
  rather than unfinished scope inside this closed slice.

### Implemented now (2026-03-12)

- Search stays isolated in `scoped-documentation-search.ts` instead of being
  handed directly to the main interviewer runtime.
- The startup search query is server-owned and deterministic from scoped topic
  metadata, not composed from raw browser-controlled browsing instructions.
- The search tool is restricted to allowed official Salesforce domains.
- The grounding model is instructed to treat retrieved pages as untrusted
  content and to ignore instructions embedded in them.
- The grounding response is schema-validated with Zod before the app will use
  it as a prompt input.
- The app only injects a compact extracted grounding brief into the voice
  prompt. It does not pass raw result pages, raw search snippets, or citation
  URLs into the live interviewer prompt.
- The shipped slice does not surface search citations or returned URLs to the
  learner, which keeps the first exposure surface narrow.
- If the search path fails, times out, or yields weak evidence, the system
  falls back to the normal scoped prompt instead of forcing low-confidence web
  content into the session.

### Done Notes

- This story closes the first-pass safety bar for startup grounding only.
- No separate suspicious-phrase monitor, URL redaction layer, or red-team test
  harness was added because the shipped slice does not expose a general live
  search pipeline.
- If broader live search ever returns, those stronger controls should be
  planned as a new hardening follow-on.

## Acceptance Criteria

1. Search-backed grounding stays behind a server-owned boundary instead of
   exposing unrestricted browsing to the live interviewer.
2. Retrieved web content is treated as untrusted input.
3. Raw retrieved text is never elevated directly into the main interviewer's
   high-trust instructions.
4. Structured grounding output is schema-validated before use.
5. Search policy is restricted to known official domains for the shipped slice.
6. If grounding fails or evidence is weak, the session falls back safely
   without using risky low-confidence web content.
7. The first shipped slice does not surface raw search payloads, citation URLs,
   or provider-specific result blobs to the learner.

## Low-Level Solution Design

- Keep the main coach and the search-backed grounding path separated.
- Allow only a narrow server-owned query contract to leave the app-owned
  planner.
- Restrict search execution to a small allowlist of official domains for the
  shipped slice.
- Instruct the grounding stage to ignore hostile instructions embedded in
  retrieved pages and extract factual product information only.
- Validate the structured grounding payload before injecting any of it into the
  voice prompt.
- Normalize the usable output into a compact brief rather than carrying raw web
  text deeper into the system.
- Fall back cleanly whenever the grounding path is slow, weak, or malformed.

## Best Practices

- Treat search results as evidence, not instructions.
- Keep public-web work isolated from the higher-trust interviewer prompt.
- Prefer structured extraction over raw result passthrough.
- Keep the first safety surface narrow when shipping a new grounding feature.
- If the search surface expands later, expand the hardening layer with it.

## Required Testing

- Non-applicable scopes do not invoke the grounding search path.
- Applicable scopes only use the allowed official-domain policy.
- Malformed or weak grounding output is rejected in favor of a bounded fallback.
- Grounding failures do not break session startup.

## Dependencies

- Hardens the startup grounding path delivered through `V2-US-01` and
  `V2-US-10`.
