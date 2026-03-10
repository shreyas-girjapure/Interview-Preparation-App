# V2-US-01: Scoped Documentation Search Orchestration

## Story

As a learner, I want the interview coach to consult the official documentation
for the active category and topic so that the answer stays current, grounded,
and tightly scoped instead of drifting into general browsing.

## Status

- `Status`: Ready for implementation
- `Why this exists`: V1 intentionally shipped with search disabled in the live
  route even though the prompt and UI were already designed around a scoped
  documentation-backed answer path.
- `Current implementation approach`: use a server-owned prompt and query planner
  to discover likely official documentation sources at runtime. We are not
  storing trusted domains or search policy metadata in the database yet.
- `Deferred follow-on`: replace or reinforce prompt-driven source discovery with
  explicit allowlists or persisted policy once the prototype flow has proven
  itself.

## Acceptance Criteria

1. Search triggers only for explicit documentation or recency intent inside the
   active scope, such as latest, recent, updated, deprecated, breaking changes,
   what the docs say, or show me the official docs.
2. Search remains locked to the active session scope and does not answer
   unrelated documentation asks directly.
3. The main coach does not receive unrestricted browsing access.
4. Search queries are built server-side from the scope snapshot, category,
   subtopics, and prompt-assisted term expansion, not from arbitrary free-form
   user text alone.
5. Search prefers official documentation sources that can be inferred
   confidently from the active topic and category. If no strong official source
   can be identified, the app returns a bounded fallback instead of broadening
   into generic browsing.
6. A successful documentation-backed answer returns both:
   a short spoken summary for the voice flow and a structured citation list for
   the transcript or side panel.
7. After the documentation answer is delivered, control returns to the scoped
   coach.
8. If search fails, times out, or yields weak evidence, the user gets a bounded
   fallback response instead of an invented answer.

## Low-Level Solution Design

- Add a server-owned orchestrator such as
  `src/lib/interview/scoped-documentation-search.ts`.
- Keep the main interviewer specialized for coaching and scope discipline.
  Route documentation or recency asks to a dedicated scoped search path instead
  of giving the main interviewer a broad live search tool.
- Add a documentation-intent detector over finalized user transcript turns so
  search is explicit and auditable.
- Build a normalized search request shape such as:
  `scopeType`, `scopeSlug`, `scopeTitle`, `category`, `subcategory`,
  `subtopics`, `topicAliases`, `recencyWindowDays`, and `userIntent`.
- Use OpenAI's web-backed capability only through a server-owned boundary.
- Add a server-owned query planner that expands the topic into likely official
  docs phrasing such as official docs, documentation, lifecycle hook names, or
  framework-specific aliases.
- Do not require DB-backed docs-domain metadata in this phase. The source
  preference lives in server code and prompt logic for now.
- Construct the effective search query from the scope snapshot plus the
  expanded category vocabulary. Example:
  `Salesforce LWC Lifecycle Hooks site:developer.salesforce.com/docs connectedCallback renderedCallback disconnectedCallback`.
- If the search results do not strongly indicate an official documentation
  source, return a bounded fallback instead of synthesizing an answer from weak
  evidence.
- Normalize search outputs into a structured citation type with:
  `title`, `url`, `source`, `publishedAt`, `snippet`, and `confidence`.
- Add a transcript event shape that can render spoken recency summaries plus
  citation rows without leaking raw provider payloads into the UI.
- Persist search invocation metadata on the session so later QA can separate
  search-backed answers from normal coaching turns.
- Add bounded upstream timeouts and a clear fallback message when the search
  path fails or returns low-confidence results.
- Reject or redirect documentation requests that drift outside the active topic
  and category even if the user names another platform explicitly.

## Best Practices

- Treat documentation lookup as a special-case capability, not a general search
  mode.
- Use prompt-assisted source discovery only as a server-owned heuristic, not as
  a browser-controlled policy surface.
- Prefer official vendor or platform documentation over blogs, forums, or
  generic search results.
- Keep the search answer short enough to sound natural in voice.
- Prefer a small number of strong citations over a long noisy list.
- Keep query construction deterministic enough that QA can replay and compare
  behavior across prompt or model versions.
- Do not allow the browser to compose or mutate the actual search query policy.
- Use category, parent topic, and subtopic terms together so the query stays
  narrow.
- If the source confidence is weak, fall back safely instead of stretching to a
  maybe-correct source.

## Example Scope Policy

- Active category: Salesforce
- Active topic: LWC Lifecycle Hooks
- Search intent:
  prefer official Salesforce documentation discovered from the topic phrasing.
- Query expansion terms:
  `LWC`, `Lightning Web Components`, `Lifecycle Hooks`,
  `connectedCallback`, `renderedCallback`, `disconnectedCallback`,
  `errorCallback`
- Expected behavior:
  if the learner asks about lifecycle hooks or the latest guidance for LWC
  lifecycle behavior, the server builds a Salesforce-focused official-docs
  query and returns a short answer plus Salesforce citations.
- Rejected drift example:
  if the learner asks to compare that topic against React hooks or Angular
  lifecycle APIs, the coach redirects back to the active Salesforce scope
  instead of broadening the search.

- Active category: JavaScript
- Active topic: Closures
- Search intent:
  prefer official JavaScript documentation discovered from the topic phrasing.
- Query expansion terms:
  `closures`, `closure`, `lexical environment`, `scope chain`
- Expected behavior:
  if the learner asks what the official docs say about closures, the search
  should favor MDN-style official documentation results and return a short
  answer with citations.

## Required Testing

- Search fires for in-scope documentation asks and does not fire for normal
  coaching turns.
- `LWC Lifecycle Hooks` resolves to Salesforce official documentation citations
  in the example flow.
- `JavaScript Closures` resolves to official JavaScript documentation citations
  such as MDN in the example flow.
- Topics without a confidently identifiable official source return a bounded
  fallback instead of a weak generic answer.
- Off-topic documentation asks are redirected back to the active scope.
- Citation rows render deterministically and remain attached to the correct
  assistant turn.
- Timeout, no-result, and malformed-result paths return bounded fallbacks.

## Dependencies

- Depends on the shipped V1 bootstrap and live transcript baseline.
- Must ship together with the security controls in `V2-US-02`.
