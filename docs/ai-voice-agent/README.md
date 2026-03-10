# AI Voice Agent V1 Story Pack

This folder is the implementation-ready planning set for the AI voice
interview feature.

Status: Closed on 2026-03-10

This folder is now the archived V1 story pack. The shipped V1 baseline lives
here for reference. All unfinished follow-on work moved into
`docs/ai-voice-agent-v2/`.

## Scope

- Scoped voice-help session anchored to one entity at a time.
- Initial visible entry point: topic detail pages.
- Designed next on the same architecture: playlist-scoped sessions.
- Deferred but supported by the same contract later: question-scoped sessions.
- OpenAI Agents SDK for TypeScript for the browser voice runtime.
- Browser voice transport over WebRTC as managed by the Agents SDK.
- Server-owned interviewer prompt and session config.
- Authenticated session start.
- Live transcript, persisted transcript turns, and written debrief.
- Controlled web search for recent changes within the active scope only.
- Formal scoring is deferred from V1.

## Explicit Non-Goals for V1

- No runtime MCP server.
- No hand-rolled low-level `RTCPeerConnection` implementation in app code.
- No push-to-talk mode.
- No raw audio storage.
- No broad unscoped assistant mode.
- No multi-scope session that drifts across unrelated topics.
- No open-ended web browsing outside the active scope.
- No formal scoring pipeline in V1.
- No cross-session performance analytics in V1.
- No replacement of the existing `Listen` button.

## Story Order

1. [US-01: Dedicated entry and immersive route](./stories/US-01-immersive-entry-route.md)
2. [US-02: Secure session bootstrap](./stories/US-02-secure-session-bootstrap.md)
3. [US-03: Browser Agents SDK client](./stories/US-03-browser-agents-sdk-client.md)
4. [US-04: Interview experience mocks and approval](./stories/US-04-immersive-interview-ui.md)
5. [US-04A: Immersive shell, voice stage, and briefing](./stories/US-04A-immersive-shell-voice-stage-and-briefing.md)
6. [US-04B: Live transcript and session controls](./stories/US-04B-live-transcript-and-session-controls.md)
7. [US-05: Transcript persistence and debrief](./stories/US-05-transcript-persistence-and-debrief.md)
8. [US-06: Reliability, security, and testing](./stories/US-06-reliability-security-and-testing.md)

## Implementation Status Snapshot

- `US-01`: Complete. Topic detail CTA, immersive route group, safe scope
  loader, and auth redirect are in place.
- `US-02`: Complete for the V1 baseline. Server-owned bootstrap, prompt
  assembly, env validation, and local session records ship today. Scoped
  recent-changes search and broader scope loaders moved to V2.
- `US-03`: Complete. The browser requests mic access only after user action,
  connects through the OpenAI Agents SDK transport, auto-starts the interview,
  and cleans up media plus session resources on exit paths.
- `US-04`: Complete. The static review route and state fixtures exist and the
  production UI split follows that approved mock structure.
- `US-04A`: Complete. The immersive shell, voice stage, and briefing card are
  now the live topic interview frame.
- `US-04B`: Complete for the V1 baseline. Live transcript rendering, mute or
  end or retry controls, and failure or completion treatments are implemented.
  Real recency-tool citations moved to V2.
- `US-05`: Complete for the V1 baseline. Session lifecycle rows and end-state
  handling are in place. Durable transcript persistence, completion debrief
  writes, and abandon flush flows moved to V2.
- `US-06`: Complete for the V1 baseline. Validation, cleanup paths, and core
  unit coverage exist. Broader observability, persistence tests, and release
  hardening moved to V2.

## V2 Handoff

The remaining follow-on work is now tracked in `docs/ai-voice-agent-v2/`:

- Grounded scoped recent-changes search with visible citations.
- Prompt-injection and exfiltration hardening for web-backed answers.
- Durable transcript persistence and server-generated debriefs.
- One-active-session policy, server-side controls, and runtime versioning.
- Tracing, observability, and debug correlation across local and OpenAI ids.
- Playlist-scoped voice interviews on the same contract.

## Industry-Aligned Improvements

- Keep the active interview job narrow: one scoped coaching task, one obvious
  escape hatch, and one explicit recovery path instead of letting the voice
  route drift into a general assistant.
- Version prompts and tool policy explicitly so each shipped runtime can be
  traced, replayed, and compared when coaching quality changes.
- Treat interruption quality as a first-class metric by logging mic grant,
  bootstrap, connect, first audio, end-of-turn, and retry timings for every
  live session.
- Add conversation repair rules for repeated silence, repeated off-topic asks,
  and repeated transcription failures before the session feels broken.
- Summarize long sessions incrementally so future transcript persistence does
  not rely on an ever-growing realtime context window.
- Keep recency answers separated behind a specialized search path with visible
  citations and a clean handoff back to the scoped interviewer.

## Delivery Gate

- Build and review high-fidelity mocks before starting either UI implementation
  story.
- Confirm the mock layout, state treatment, and copy in-thread after mock
  review and before starting US-04A or US-04B.

## Locked Architecture Decisions

- Primary V1 route: `/topics/[slug]/mock-interview`
- V2 planned route on the same contract: `/playlists/[slug]/mock-interview`
- Deferred route: `/questions/[slug]/mock-interview`
- Session scope contract: `{ scopeType, scopeSlug }`
- Voice runtime: OpenAI Agents SDK for TypeScript
- Browser transport: WebRTC under the SDK
- Server bootstrap: authenticated app-owned session bootstrap endpoint
- Default model: `gpt-realtime-mini`
- Premium model option: `gpt-realtime`
- Default transcription model: `gpt-4o-mini-transcribe`
- Default voice: `alloy`
- Turn-taking: SDK-managed Realtime voice session with app-owned guardrails
- Runtime tools: constrained recent-changes web search only
- Runtime MCP: none

## Scope Strategy

- `topic` is the first enabled scope and the only UI entry point for testing.
- `playlist` should reuse the same backend and client contract once enabled.
- `question` is intentionally deferred until the broader scope model has proven
  out.
- Every session is single-scope. The agent should not expand into unrelated
  interview coaching, general Q and A, or arbitrary browsing.
- Scope is resolved on the server into a private scope snapshot:
  title, description, allowed concepts, linked questions or items, and session
  guardrails.

## Anti-Drift Guardrails

- The browser may request only a `scopeType` and `scopeSlug`; all real scope
  data is resolved server-side.
- The server builds a private instruction block that explicitly states:
  stay inside the active scope, do not answer unrelated questions directly,
  redirect the user back to the current scope, and do not broaden the session
  into a general assistant.
- Web search, when enabled, must be constrained to recent changes about the
  active scope. It should not be used for generic web browsing or unrelated
  questions.
- The main coach should not receive unrestricted browsing power. Use a
  specialized recent-changes search path instead.
- The UI should label the active scope clearly so the user understands what the
  session is about.
- Transcript and QA review should treat scope drift as a defect.

## Recent Changes Search

- OpenAI's current docs and cookbook examples show that the agents stack can
  use built-in web search for up-to-date information.
- We should add this only as a scoped capability:
  recent changes about the active topic or playlist.
- The preferred design is a specialized recent-changes search agent or a
  tightly constrained server-owned search tool, not open browsing on the main
  voice coach.
- Search should trigger only when the user explicitly asks for latest, recent,
  new, updates, changes, releases, or similar recency intent.
- The query should be constructed server-side from the active scope snapshot and
  recency intent, not from arbitrary user free-form search strings alone.
- Search results should come back as a short spoken summary plus a visible list
  of citations in the UI transcript or side panel.
- After the search response, control should return to the main scoped coach.

## Model Strategy

- Default V1 model: `gpt-realtime-mini`
- Premium or higher-quality upgrade path: `gpt-realtime`
- Transcription model: `gpt-4o-mini-transcribe`
- Keep model and voice env-configurable so pricing or quality can change
  without rewriting the feature.

## Cross-Cutting Best Practices

- Never pass `answerMarkdown` to the browser for the interview page.
- Keep all interviewer instructions and answer-aware rubric content server-side.
- Add a thin adapter between Agents SDK events and app-local UI or transcript
  types.
- Keep the voice agent single-scope per session and make scope transitions
  explicit future work, not implicit model behavior.
- Treat web results as untrusted input and summarize them conservatively.
- Persist only finalized transcript turns.
- Use the current Agents SDK voice-agent quickstart and current OpenAI docs at
  implementation time rather than relying on stale beta samples.
- Treat the mock route as the approval surface for the UI before wiring the
  live interview state into the page.
- Design the UI around both voice and visible transcript, not an orb-only
  screen.
- Release microphone, SDK session, and browser audio resources on every exit
  path.
- Ignore unrelated suggestions from `docs/2026-03-08-current-git-review.md`
  for this feature until they are explicitly pulled into the scope.

## Primary Implementation Targets

- `src/app/topics/[slug]/page.tsx`
- `src/app/home-mocks/voice-interview/page.tsx`
- `src/app/(immersive)/topics/[slug]/mock-interview/page.tsx`
- `src/app/(immersive)/playlists/[slug]/mock-interview/page.tsx`
- `src/app/api/interview/sessions/route.ts`
- `src/lib/ai/voice-agent.ts`
- `src/lib/interview/voice-interview-prompt.ts`
- `src/lib/interview/voice-scope.ts`
- `src/lib/interview/recent-changes-search.ts`
- `src/hooks/use-voice-interview-agent.ts`
- `supabase/migrations/<timestamp>_interview_voice_sessions.sql`
