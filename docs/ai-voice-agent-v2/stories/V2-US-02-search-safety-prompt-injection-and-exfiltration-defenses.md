# V2-US-02: Search Safety, Prompt Injection, and Exfiltration Defenses

## Story

As the app owner, I need scoped search to resist prompt injection and data
exfiltration so that web-backed recency answers do not turn into a security
hole.

## Status

- `Status`: Draft
- `Why this exists`: OpenAI's current docs explicitly warn that web search and
  search-like tool outputs can carry prompt-injection payloads, and that
  built-in model defenses are not sufficient on their own.

## Acceptance Criteria

1. All search results are treated as untrusted input.
2. Raw web content is never elevated into a high-trust system instruction for
   the main interviewer.
3. Tool arguments and intermediate payloads are schema-validated before use.
4. Search-backed answers cannot exfiltrate private app data, hidden prompt
   content, or user-specific secrets into downstream queries or visible URLs.
5. Citation links are screened before being displayed or persisted.
6. Search safety failures are logged with enough detail for review without
   dumping secrets or full prompt bodies.
7. Red-team tests cover malicious snippets, malicious URLs, and malicious
   instructions embedded in result text.

## Low-Level Solution Design

- Keep the main coach and the search path separated.
- Design the search pipeline as four low-trust stages:
  query planning, search execution, result sanitization, and answer
  summarization.
- Allow only a narrow structured query contract to leave the app-owned search
  planner.
- Strip or ignore result text that tries to override policy, reveal secrets, or
  redirect the model away from the scoped task.
- Never pass hidden app instructions, full scope snapshots, answer rubrics, or
  user-private data into search queries.
- Validate citation URLs before storing or rendering them.
- Do not auto-open returned links or recursively follow extra links from search
  results.
- Support optional per-scope preferred-domain policies so known official
  sources can be weighted first when the active scope maps to a vendor,
  framework, or product ecosystem.
- Add a compact security monitor that flags suspicious phrases such as:
  ignore previous instructions, send data, reveal system prompt, or encoded
  payloads embedded in URLs.
- Record search requests, normalized tool calls, and sanitized result metadata
  so periodic review is possible.

## Relevant OpenAI Guidance

- Agent-builder safety:
  <https://developers.openai.com/api/docs/guides/agent-builder-safety/>
- Deep research prompt injection and exfiltration:
  <https://developers.openai.com/api/docs/guides/deep-research/#prompt-injection-and-exfiltration>
- Deep research risk controls:
  <https://developers.openai.com/api/docs/guides/deep-research/#ways-to-control-risk>

## Best Practices

- Treat search results as evidence, not instructions.
- Prefer structured extraction over passing arbitrary result text between
  components.
- Log tool calls and model-visible search payloads in a reviewable form.
- Stage workflows so public-web work stays isolated from any future private
  context or higher-trust server logic.
- Make security review a release gate for any search-capable voice build.

## Required Testing

- Malicious result text that says to ignore system instructions is ignored.
- Malicious result text that asks for secrets or hidden prompts is blocked.
- Malicious citation URLs with encoded data or suspicious parameters are
  rejected or redacted.
- Search failures triggered by safety filters return a bounded user-facing
  fallback.

## Dependencies

- Hardens `V2-US-01` and should ship with it.
