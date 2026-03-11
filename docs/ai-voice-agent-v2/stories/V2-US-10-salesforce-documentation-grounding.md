# V2-US-10: Salesforce Documentation Grounding for Voice Agent

## Story

As a learner practicing Salesforce interview questions, I want the AI voice
agent to ground its responses in official Salesforce documentation searches so
that answers are accurate, highly specific, and reflect the latest platform
capabilities rather than generalized LLM knowledge.

## Status

- `Status`: Ready for implementation; no grounding code shipped yet (as of 2026-03-12)
- `Why this exists`: currently, the AI voice agent does not perform enough
  grounding searches when speaking, leading to answers that may lack the
  precise, official vocabulary or recent framework constraints expected in a
  Salesforce context.
- `Current baseline`: citation rendering and citation persistence already
  exist, but the live prompt still explicitly says recent-changes browsing is
  unavailable and there is no scoped documentation-search module in the app
  yet.
- `Current implementation approach`: integrate a dedicated documentation search
  step for Salesforce categories before the agent formulates its spoken
  response, passing the retrieved documentation context into the agent prompt as
  grounding data.
- `Deferred follow-on`: if Salesforce releases an official MCP
  (Model Context Protocol) server for documentation, transition the search
  mechanism to use that server instead of the current custom search
  integration.
- `Handoff note`: this is net-new search orchestration work. The current branch
  only has the citation plumbing and placeholder UI needed to display grounded
  results later.

### Implemented now (2026-03-12)

- Transcript items, persisted transcript rows, API validation, and the live
  transcript UI already support per-turn citations.
- `toAbsoluteVoiceInterviewCitationUrl` already normalizes stored citation links
  for persistence and rendering.
- The runtime shell already preserves citation rows for system or search turns,
  so grounded documentation results have a place to land without redesigning
  the UI.

### Still pending

- No scoped documentation search orchestrator exists yet; there is no
  `src/lib/interview/scoped-documentation-search.ts`.
- No Salesforce detection, domain restriction, or query planner is wired into
  the voice runtime.
- The live prompt still explicitly tells the model that recent-changes browsing
  is not enabled directly in the session.
- No grounding-provider abstraction or swappable MCP adapter exists yet.
- No real documentation citations are generated during voice turns; current
  citations are placeholder scope and question links.
- No timeout or fallback handling for grounding latency exists because the
  search step does not exist yet.

## Acceptance Criteria

1. Voice agent detects when a question falls into a Salesforce category or
   subcategory and triggers a grounding search against official Salesforce
   documentation such as Salesforce Developers, Trailhead, and Help &
   Training.
2. The search query is constructed based on the active topic, question intent,
   and Salesforce-specific terminology.
3. The retrieved snippets and URLs are injected into the context window for the
   interviewer's formulation step, ensuring the spoken answer relies on the
   retrieved text.
4. The agent provides concise, natural spoken responses that are factually
   aligned with the grounded documentation, without reading long paragraphs of
   documentation verbatim.
5. In the transcript or side panel, citations to the Salesforce documentation
   used for grounding are surfaced to the user.
6. The architecture supports swapping out the underlying search implementation
   for a future Salesforce MCP server without rewriting the core orchestration
   logic.

## Low-Level Solution Design

- Extend the search orchestrator, for example
  `src/lib/interview/scoped-documentation-search.ts`, to prioritize and enforce
  Salesforce domains such as `developer.salesforce.com` and
  `help.salesforce.com` when the active category is Salesforce.
- Hook into the voice agent's generation lifecycle so the documentation search
  completes and yields context before the LLM begins streaming the final spoken
  answer.
- Define a structured interface for the grounding data provider so the current
  web-search-based implementation can later be replaced by a future
  `salesforce-mcp-server`.
- Update the system or session prompt dynamically to instruct the model to base
  its reasoning strictly on the provided grounding context and to cite when
  appropriate.
- Introduce a mechanism to handle search timeouts gracefully. If search fails
  or is too slow, the agent should fall back to a safe, bounded response.
- Emit citation metadata alongside transcript events so the UI can render
  documentation links alongside the agent's turn.

## Best Practices

- Do not block the voice response for too long; set aggressive timeouts for the
  grounding search to maintain conversational latency.
- Ensure the injected context is dense and relevant to avoid blowing up the
  token window or distracting the model.
- Abstract the search provider so the leap to a native Salesforce MCP server is
  just a configuration or plugin change down the line.
- Avoid generic web results when grounding Salesforce topics; restrict to
  known, high-signal official domains.

## Dependencies

- Relies on the core search orchestration patterns defined in `V2-US-01`.
- Needs the transcript persistence and UI components to render citations.
