# AI Voice Agent V2 Epic

Status: Draft

This folder is the active planning set for AI voice interview V2.

V1 is now the shipped baseline and archived in `docs/ai-voice-agent/`. V2 is
the follow-on epic for the remaining work that was intentionally moved out of
V1 on 2026-03-10.

## Story Status Board

1. `V2-US-01` Scoped documentation search orchestration: `Ready for implementation`
2. `V2-US-02` Search safety, prompt injection, and exfiltration defenses: `Draft`
3. `V2-US-03` Transcript persistence and server debriefs: `Closed`
4. `V2-US-04` Live-session policy and server-side controls: `Closed with follow-up in V2-US-09`
5. `V2-US-05` Observability, tracing, debug correlation, and session cost accounting: `Ready for implementation`
6. `V2-US-06` Playlist-scoped voice interviews: `Deferred for current implementation window`
7. `V2-US-07` Realtime speech-to-speech quality hardening: `Deferred for current implementation window; partially implemented`
8. `V2-US-08` Chained `STT -> LLM -> TTS` voice runtime: `Prioritized for implementation; draft with contract groundwork`
9. `V2-US-09` Cross-device session revocation and takeover recovery: `Draft`
10. `V2-US-10` Salesforce documentation grounding for voice agent: `Prioritized for implementation; ready for implementation`
11. `V2-US-11` Structured conversation prompt tuning and grounded turn steering: `Prioritized for implementation; ready for implementation`

## Current Implementation Priority

1. `V2-US-08` Chained `STT -> LLM -> TTS` voice runtime
2. `V2-US-10` Salesforce documentation grounding for voice agent
3. `V2-US-11` Structured conversation prompt tuning and grounded turn steering

Deferred for this planning window:

- `V2-US-06` Playlist-scoped voice interviews
- `V2-US-07` Realtime speech-to-speech quality hardening

## V2 Goals

- Add grounded scoped official-documentation answers with visible citations.
- Add explicit prompt-injection and exfiltration defenses for search-backed
  answers.
- Make interviewer turns more structured and adaptive by grounding each turn in
  scope, transcript state, and evidence instead of relying on one mostly static
  prompt.
- Keep a hardened Realtime speech-to-speech runtime as the low-latency live
  lane.
- Add a second server-owned chained voice runtime:
  `STT -> text LLM -> TTS`.
- Support both runtime lanes behind one shared session contract, one shared
  immersive shell, and one server-owned runtime-selection policy.
- Persist finalized transcript turns and generate server-owned written
  debriefs.
- Enforce one active live session per user and keep sensitive runtime controls
  on the server.
- Add production-grade tracing, observability, and debug correlation between
  app-owned and OpenAI-owned session identifiers.
- Roll out playlist-scoped voice interviews on the same backend contract.

## Runtime Strategy

- `realtime_sts` remains a first-class runtime. It is the low-latency lane for
  the most natural back-and-forth interview feel.
- `chained_voice` is added as a second first-class runtime. It is the
  higher-control lane for stronger transcript determinism, better support
  traces, and eventual true server-owned termination.
- V2 is not a migration away from Realtime speech-to-speech. The plan is to
  support both lanes and let the server choose between them by policy,
  environment, feature flag, or runtime profile.
- Transcript persistence, debrief generation, session policy, telemetry, and
  scope resolution should stay runtime-agnostic.
- The browser must not choose the runtime directly. Runtime routing stays
  server-owned.

## Explicit Non-Goals for V2

- No open-ended general browsing mode.
- No runtime MCP server.
- No raw audio storage.
- No formal scoring pipeline or cross-session learner ranking.
- No question-scoped interview route unless V2 scope is explicitly expanded
  later.

## Story Catalog

1. [V2-US-01: Scoped documentation search orchestration](./stories/V2-US-01-scoped-recent-changes-search-orchestration.md)
2. [V2-US-02: Search safety, prompt injection, and exfiltration defenses](./stories/V2-US-02-search-safety-prompt-injection-and-exfiltration-defenses.md)
3. [V2-US-03: Transcript persistence and server debriefs](./stories/V2-US-03-transcript-persistence-and-server-debriefs.md)
4. [V2-US-04: Live-session policy and server-side controls](./stories/V2-US-04-live-session-policy-and-server-side-controls.md)
5. [V2-US-05: Observability, tracing, debug correlation, and session cost accounting](./stories/V2-US-05-observability-tracing-and-debug-correlation.md)
6. [V2-US-06: Playlist-scoped voice interviews](./stories/V2-US-06-playlist-scoped-voice-interviews.md)
7. [V2-US-07: Realtime speech-to-speech quality hardening](./stories/V2-US-07-realtime-sts-quality-hardening.md)
8. [V2-US-08: Chained STT -> LLM -> TTS voice runtime](./stories/V2-US-08-chained-stt-llm-tts-runtime.md)
9. [V2-US-09: Cross-device session revocation and takeover recovery](./stories/V2-US-09-cross-device-session-revocation-and-takeover-recovery.md)
10. [V2-US-10: Salesforce documentation grounding for voice agent](./stories/V2-US-10-salesforce-documentation-grounding.md)
11. [V2-US-11: Structured conversation prompt tuning and grounded turn steering](./stories/V2-US-11-structured-conversation-prompt-tuning-and-grounded-turn-steering.md)

## Current Planning Snapshot

- `V2-US-01`: Ready for implementation. This is the first implementation story
  and the main user-visible capability gap left after V1. The current approach
  uses server-owned prompt and query planning to discover official docs at
  runtime; DB-backed source policy is deferred.
- `V2-US-02`: Draft. This is a release gate for V2-US-01; do not ship scoped
  search without the hardening controls.
- `V2-US-03`: Closed. Transcript persistence, terminal write routes, server
  debrief generation, and single-session readback are complete and validated
  enough to close the story.
- `V2-US-04`: Closed with follow-up in `V2-US-09`. One-live-session
  enforcement, stale reclaim, runtime version persistence, bootstrap conflict
  responses, and server-owned `force-end`/`heartbeat` are complete. The
  remaining cross-browser and cross-device revocation gap is now treated as a
  separate follow-up story rather than unfinished core scope.
- `V2-US-05`: Ready for implementation, but not the current product-priority
  lane. OpenAI tracing configuration, structured telemetry, session-level cost
  accounting, redaction rules, and support correlation paths are scoped
  concretely enough to build when infrastructure focus returns.
- `V2-US-06`: Deferred for the current planning window. The shared session
  contract and playlist detail data are already in place, but playlist scope
  expansion is not the current product bottleneck.
- `V2-US-07`: Deferred for the current planning window. Server-owned Realtime
  tuning, prompt shaping, trace metadata, and session observability are now in
  code, but the normalized runtime-profile contract and fuller quality
  diagnostics remain follow-up work rather than the next active lane.
- `V2-US-08`: Prioritized for implementation and not from zero. Shared
  observability types, usage-event schemas, and cost rollups already reserve a
  `chained_voice` runtime lane; the actual chained runtime, turn endpoint, and
  routing policy are still unbuilt. This is now the first runtime story to pull
  forward.
- `V2-US-09`: Draft. This closes the remaining recovery gap after `V2-US-04`
  for refreshes, takeovers, and cross-browser or cross-device revocation. The
  recommended first pass is row-level revocation delivery plus heartbeat and
  visibility fallback. The long-term story must remain compatible with a
  two-runtime product where hard remote kill is strongest on the chained lane.
- `V2-US-10`: Prioritized for implementation and not started. Citation plumbing
  is already in place, but there is no scoped documentation-search
  orchestrator, no Salesforce domain policy, and no grounding step in the live
  voice runtime yet.
- `V2-US-11`: Prioritized for implementation and not started. The current voice
  prompt is intentionally strict and compact, but it does not yet have a
  server-owned turn brief or answer-interpretation layer that makes the
  interviewer flexible when learner responses are partial, indirect, or
  clarifying.
- The runtime stories can be pulled forward if runtime stability and runtime
  routing become the immediate blocker for broader V2 rollout.

## Manual Quick Checks (V2-US-03, V2-US-04, and V2-US-09)

1. V2-US-03 transcript/debrief persistence:
   start interview, speak a few finalized turns, end session, verify
   `POST /events` + `POST /complete` succeed, then reload via
   `GET /api/interview/sessions/{sessionId}` and confirm persisted transcript plus
   debrief.
2. V2-US-03 cancel/failure persistence:
   cancel or fail a session after finalized turns and confirm transcript rows are
   still present while session is not marked `completed`.
3. V2-US-04 one-live-session policy:
   keep a live session in tab A, start another in tab B (same user), expect
   `409 live_session_exists` with blocking-session metadata.
4. V2-US-04 heartbeat and force-end:
   while live, confirm periodic `POST /heartbeat`; then call
   `POST /force-end` and verify state transitions to `cancelled`, after which a
   new session can start.
5. V2-US-09 cross-browser takeover recovery:
   keep a live session in browser A, trigger takeover from browser B, and
   confirm the old reachable client shows an `ended elsewhere` state quickly
   instead of continuing to look live.
6. V2-US-09 refresh recovery:
   refresh an active session, then attempt a new start and confirm the blocked
   state offers takeover or quick recovery without waiting for a long stale
   window.

## Next Session Handoff (updated 2026-03-12)

Previously completed:

- V2-US-03 core implementation plus ordering/idempotency hardening in tests.
- V2-US-04 core implementation: one-live-session enforcement, stale reclaim,
  runtime version persistence, `409 live_session_exists`, and server-owned
  `force-end`/`heartbeat` endpoints.
- Client wiring for conflict messaging and live-session heartbeat pings.
- Test and build verification passing on current branch.

Pending next:

- Start `V2-US-08` (chained `STT -> LLM -> TTS` runtime) as the active runtime
  implementation lane.
- Pull `V2-US-10` immediately after or alongside the runtime turn pipeline so
  grounded Salesforce answers can plug into the first chained path.
- Follow with `V2-US-11` to make the interviewer more adaptive and structured
  once chained runtime control and grounding inputs are in place.
- Keep `V2-US-06` and `V2-US-07` deferred unless playlist expansion or
  additional Realtime hardening becomes the immediate blocker again.

## OpenAI Guidance Incorporated

- OpenAI's current voice-agent guidance still recommends the TypeScript Agents
  SDK plus Realtime sessions as the browser voice starting point.
- OpenAI's current prompt-injection guidance explicitly warns that web search
  and search-like tool outputs can contain malicious instructions or
  exfiltration payloads, and that developers still need their own controls.
- OpenAI's current Realtime reference says session tracing is supported and can
  write traces to the Traces Dashboard with a workflow name, group id, and
  metadata.
- Our current bootstrap already passes a Realtime session config from the
  server, so V2 should replace `tracing: null` with explicit trace metadata
  rather than leaving tracing disabled.

## Debug Correlation Strategy

- App-owned `interview_sessions.id` remains the primary support and analytics
  identifier.
- OpenAI `openai_session_id` remains persisted as the upstream session handle.
- Realtime tracing should use the local session id as the trace `group_id` or
  metadata key so the dashboard and app logs can be correlated quickly.
- If built-in tracing is unavailable, disabled, or unsuitable for privacy
  reasons, V2 must still emit app-owned structured logs and metrics that make a
  session debuggable from local data alone.

## Delivery Rules

- Implement one active story at a time following the `Current Implementation
Priority` section above unless priorities are changed again explicitly.
- Do not ship `V2-US-01` without the security controls in `V2-US-02`.
- `V2-US-08` has now been explicitly re-prioritized ahead of the remaining
  `V2-US-07` hardening work. Keep the shared runtime descriptor and support
  model aligned, but do not treat full `V2-US-07` completion as a blocker.
- Keep the browser thin. Prompt policy, tool policy, search policy, runtime
  versioning, and tracing config stay server-owned.
- Treat search results as untrusted input all the way through the pipeline.
- Treat runtime selection as a server-owned policy. The browser must not choose
  `realtime_sts` vs `chained_voice`, or premium vs balanced runtime paths,
  directly.

## Official OpenAI References

- Voice agents:
  <https://developers.openai.com/api/docs/guides/voice-agents/>
- Realtime WebRTC:
  <https://developers.openai.com/api/docs/guides/realtime-webrtc/>
- Realtime server controls:
  <https://developers.openai.com/api/docs/guides/realtime-server-controls/>
- Realtime session create reference:
  <https://developers.openai.com/api/reference/resources/realtime/subresources/sessions/methods/create/>
- Realtime client secret create reference:
  <https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create/>
- Agent-builder safety:
  <https://developers.openai.com/api/docs/guides/agent-builder-safety/>
- Deep research prompt injection and exfiltration:
  <https://developers.openai.com/api/docs/guides/deep-research/#prompt-injection-and-exfiltration>
- Deep research risk controls:
  <https://developers.openai.com/api/docs/guides/deep-research/#ways-to-control-risk>
