# AI Voice Agent V2 Epic

Status: Draft

This folder is the active planning set for AI voice interview V2.

V1 is now the shipped baseline and archived in `docs/ai-voice-agent/`. V2 is
the follow-on epic for the remaining work that was intentionally moved out of
V1 on 2026-03-10.

## Story Status Board

1. `V2-US-01` Scoped documentation search orchestration: `Ready for implementation`
2. `V2-US-02` Search safety, prompt injection, and exfiltration defenses: `Draft`
3. `V2-US-03` Transcript persistence and server debriefs: `Implementation done; QA pending`
4. `V2-US-04` Live-session policy and server-side controls: `Implementation done; rollout validation pending`
5. `V2-US-05` Observability, tracing, and debug correlation: `Ready for implementation`
6. `V2-US-06` Playlist-scoped voice interviews: `Ready for implementation`
7. `V2-US-07` Realtime speech-to-speech quality hardening: `Draft`
8. `V2-US-08` Chained `STT -> LLM -> TTS` voice runtime: `Draft`

## V2 Goals

- Add grounded scoped official-documentation answers with visible citations.
- Add explicit prompt-injection and exfiltration defenses for search-backed
  answers.
- Harden the current Realtime speech-to-speech runtime so the premium live path
  sounds stable, complete, and supportable.
- Add a second server-owned chained voice runtime:
  `STT -> text LLM -> TTS`.
- Persist finalized transcript turns and generate server-owned written
  debriefs.
- Enforce one active live session per user and keep sensitive runtime controls
  on the server.
- Add production-grade tracing, observability, and debug correlation between
  app-owned and OpenAI-owned session identifiers.
- Roll out playlist-scoped voice interviews on the same backend contract.

## Explicit Non-Goals for V2

- No open-ended general browsing mode.
- No runtime MCP server.
- No raw audio storage.
- No formal scoring pipeline or cross-session learner ranking.
- No question-scoped interview route unless V2 scope is explicitly expanded
  later.

## Story Order

1. [V2-US-01: Scoped documentation search orchestration](./stories/V2-US-01-scoped-recent-changes-search-orchestration.md)
2. [V2-US-02: Search safety, prompt injection, and exfiltration defenses](./stories/V2-US-02-search-safety-prompt-injection-and-exfiltration-defenses.md)
3. [V2-US-03: Transcript persistence and server debriefs](./stories/V2-US-03-transcript-persistence-and-server-debriefs.md)
4. [V2-US-04: Live-session policy and server-side controls](./stories/V2-US-04-live-session-policy-and-server-side-controls.md)
5. [V2-US-05: Observability, tracing, and debug correlation](./stories/V2-US-05-observability-tracing-and-debug-correlation.md)
6. [V2-US-06: Playlist-scoped voice interviews](./stories/V2-US-06-playlist-scoped-voice-interviews.md)
7. [V2-US-07: Realtime speech-to-speech quality hardening](./stories/V2-US-07-realtime-sts-quality-hardening.md)
8. [V2-US-08: Chained STT -> LLM -> TTS voice runtime](./stories/V2-US-08-chained-stt-llm-tts-runtime.md)

## Current Planning Snapshot

- `V2-US-01`: Ready for implementation. This is the first implementation story
  and the main user-visible capability gap left after V1. The current approach
  uses server-owned prompt and query planning to discover official docs at
  runtime; DB-backed source policy is deferred.
- `V2-US-02`: Draft. This is a release gate for V2-US-01; do not ship scoped
  search without the hardening controls.
- `V2-US-03`: Implementation done; QA pending. Core persistence, terminal write
  routes, server debrief generation, single-session readback, and
  ordering/idempotency test hardening are implemented in the active branch;
  remaining work is final manual QA closeout before story completion.
- `V2-US-04`: Implementation done; rollout validation pending.
  One-active-session enforcement, stale-session reclamation, runtime version
  persistence, bootstrap conflict responses, and server-owned
  `force-end`/`heartbeat` endpoints are implemented in the active branch;
  remaining work is caller-policy confirmation and staged concurrency checks.
- `V2-US-05`: Ready for implementation. OpenAI tracing configuration,
  structured telemetry, redaction rules, and support correlation paths are now
  scoped concretely enough to build.
- `V2-US-06`: Ready for implementation. Playlist scope is now specified around
  a normalized playlist scope snapshot, a real `/playlists/[slug]/mock-interview`
  route, and shared scope-owned navigation and citation metadata.
- `V2-US-07`: Draft. This is the premium-runtime stabilization story for the
  existing Realtime speech-to-speech lane.
- `V2-US-08`: Draft. This adds a second server-owned voice runtime based on a
  chained `STT -> text LLM -> TTS` architecture.
- The runtime stories can be pulled forward if runtime stability and runtime
  routing become the immediate blocker for broader V2 rollout.

## Manual Quick Checks (V2-US-03 and V2-US-04)

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

## Next Session Handoff (2026-03-10)

Completed today:

- V2-US-03 core implementation plus ordering/idempotency hardening in tests.
- V2-US-04 core implementation: one-live-session enforcement, stale reclaim,
  runtime version persistence, `409 live_session_exists`, and server-owned
  `force-end`/`heartbeat` endpoints.
- Client wiring for conflict messaging and live-session heartbeat pings.
- Test and build verification passing on current branch.

Pending next:

- Run manual QA checklist above for V2-US-03 and V2-US-04.
- Finalize production caller policy for `force-end` endpoint (owner-only vs
  role-gated admin path).
- Run staged concurrency checks on linked Supabase with real concurrent
  bootstrap attempts.
- Start V2-US-05 (observability, tracing, and debug correlation).

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

- Implement one story at a time in the order above.
- Do not ship `V2-US-01` without the security controls in `V2-US-02`.
- Keep the browser thin. Prompt policy, tool policy, search policy, runtime
  versioning, and tracing config stay server-owned.
- Treat search results as untrusted input all the way through the pipeline.
- Treat runtime selection as a server-owned policy. The browser must not choose
  premium vs balanced voice paths directly.

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
