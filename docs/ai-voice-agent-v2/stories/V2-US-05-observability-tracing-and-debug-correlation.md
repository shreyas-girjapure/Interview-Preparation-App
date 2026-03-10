# V2-US-05: Observability, Tracing, and Debug Correlation

## Story

As the app owner, I need a single interview session to be traceable across app
logs, metrics, and OpenAI runtime identifiers so support and debugging do not
depend on guesswork.

## Status

- `Status`: Ready for implementation
- `Why this exists`: V1 captures useful timing data locally, but today that
  data is mostly development-only and is not yet correlated with durable
  session diagnostics.
- `Current baseline`: the client already measures bootstrap and connect timings,
  the session row already stores `openai_session_id`, and the Realtime bootstrap
  currently sets `tracing: null`.
- `Implementation note`: this story should promote the existing timing and
  session-id baseline into durable structured telemetry without dumping raw
  prompts, raw transcript text, or client secrets into logs.

## Acceptance Criteria

1. Every live session can be correlated by app-owned session id, OpenAI session
   id, tracing mode, and runtime version metadata.
2. The app emits durable structured telemetry for:
   bootstrap, mic permission, WebRTC connect, first assistant audio, first
   assistant response, disconnects, transcript flush, search latency,
   debrief generation, and completion or cancellation.
3. Failed startup sessions still store enough telemetry to debug the failure.
4. OpenAI tracing is enabled when policy allows it and disabled cleanly when it
   does not.
5. When tracing is enabled, the trace configuration is set during session
   creation and is never mutated later in the session.
6. When explicit trace metadata is supported by the current SDK/API path, the
   app-owned session id is attached as trace metadata or group id. If only
   `auto` is practical in the current integration, app-owned telemetry still
   provides full correlation on our side.
7. Sensitive data is not dumped into normal logs or telemetry payloads.
8. Operators have a documented path for debugging a failed or slow session.

## Low-Level Solution Design

### Data Model

- Extend `interview_sessions` with observability fields such as:
  `openai_trace_enabled`, `openai_trace_mode`, `openai_trace_group_id`,
  `openai_trace_workflow_name`, `runtime_environment`,
  `last_disconnect_reason`, `retry_count`, `telemetry_updated_at`,
  and `diagnostics_json`.
- Reuse the runtime version fields introduced in `V2-US-04`.
- Add a dedicated telemetry table such as `interview_session_events`:
  `id`, `session_id`, `event_key`, `event_name`, `event_source`,
  `attempt_number`, `recorded_at`, `duration_ms`, `payload_json`,
  `created_at`.
- Add a unique constraint on `(session_id, event_key)` so singleton telemetry
  events can be retried idempotently.
- Add an index on `(session_id, recorded_at)`.

### Telemetry Event Model

- Use a small controlled event vocabulary, for example:
  `bootstrap.started`
  `bootstrap.succeeded`
  `bootstrap.failed`
  `mic_permission.granted`
  `mic_permission.denied`
  `webrtc.connected`
  `webrtc.disconnected`
  `assistant.first_audio`
  `assistant.first_response`
  `search.completed`
  `search.failed`
  `transcript_flush.completed`
  `transcript_flush.failed`
  `debrief.completed`
  `debrief.failed`
  `session.completed`
  `session.cancelled`
  `session.failed`
- Use `event_source` values such as:
  `server`, `client`, `search`, `persistence`, and `debrief`.
- Keep payloads compact and structured. Example payload keys:
  `errorCode`, `disconnectReason`, `messageCount`, `searchTurnCount`,
  `openAiSessionId`, `scopeType`, `scopeSlug`, `promptVersion`,
  `searchPolicyVersion`, `transportVersion`.

### Write Paths

- Add a server helper such as
  `recordInterviewSessionEvent({ sessionId, eventKey, eventName, ... })`.
- Add `POST /api/interview/sessions/[id]/telemetry` for client-originated
  events that occur after the initial bootstrap request.
- Emit server-originated events directly from server routes and helpers:
  - bootstrap success or failure in `POST /api/interview/sessions`
  - terminal events in `V2-US-03` complete or cancel routes
  - force-end or heartbeat-related policy events from `V2-US-04`
- Keep the telemetry endpoint idempotent by requiring a client-supplied
  `eventKey`.

Suggested request shape:

```ts
type VoiceInterviewTelemetryEventRequest = {
  events: Array<{
    eventKey: string;
    eventName:
      | "mic_permission.granted"
      | "mic_permission.denied"
      | "webrtc.connected"
      | "webrtc.disconnected"
      | "assistant.first_audio"
      | "assistant.first_response"
      | "transcript_flush.completed"
      | "transcript_flush.failed"
      | "search.completed"
      | "search.failed";
    eventSource: "client" | "search" | "persistence";
    attemptNumber?: number;
    durationMs?: number;
    payload?: Record<string, string | number | boolean | null>;
    recordedAt: string;
  }>;
};
```

### Realtime Tracing Configuration

- Update `src/lib/ai/voice-agent.ts` so the bootstrap helper can receive the
  local session id and runtime version metadata:
  `createVoiceInterviewBrowserBootstrap({ scope, sessionId, runtimeVersions })`
- Replace the hardcoded `tracing: null` with a server-owned tracing builder.
- Add an env-controlled tracing mode such as:
  `OPENAI_REALTIME_TRACING_MODE=off|auto|structured`
- Current official Realtime docs say:
  - tracing can be set to `null` to disable
  - `auto` creates a trace with default workflow name, group id, and metadata
  - once enabled, tracing configuration cannot be modified for that session
- Implementation rule:
  - if policy is `off`, set `tracing: null`
  - if policy is `auto`, set `tracing: "auto"` or the SDK-equivalent value
  - if the current SDK/API path supports explicit tracing configuration with
    workflow name, group id, and metadata, prefer that and attach the
    app-owned session id there
- Persist the chosen tracing mode and any known trace correlation fields on the
  local session row.

### Client Instrumentation

- Promote the existing measurements in
  `src/lib/interview/voice-interview-client-flow.ts` from dev-only console logs
  into telemetry writes.
- The current measured timings already include:
  `bootstrapApi`
  `micPermission`
  `webrtcConnect`
  `timeToLive`
  `firstAssistantAudio`
  `firstAssistantResponse`
- Keep the local timing helper, but change its responsibility from
  `console.info` in development to:
  1. return structured measurements
  2. emit batched telemetry events when meaningful milestones occur
- Attach `attemptNumber` from the client retry flow so support can tell first
  attempt from retry behavior.

### Structured Logging

- Add a server logging helper such as
  `logVoiceInterviewDiagnostic(eventName, payload)`.
- Log in compact JSON-like form with:
  `sessionId`, `openAiSessionId`, `scopeType`, `scopeSlug`, `state`,
  `eventName`, `durationMs`, `errorCode`, `traceMode`, and runtime versions.
- Do not log:
  client secret values, full prompts, raw transcript bodies, raw search result
  text, or debrief content bodies in normal logs.
- If deeper investigation is needed later, use the persisted transcript and
  debrief tables from `V2-US-03`, not high-volume console dumping.

### Operator Runbook

- Add a support runbook in docs or code comments with this path:
  1. start from local `interview_sessions.id`
  2. inspect session state, runtime versions, and tracing mode
  3. inspect `openai_session_id`
  4. inspect ordered telemetry events for startup, disconnect, persistence, and
     completion
  5. inspect transcript or debrief persistence status from `V2-US-03`
  6. inspect OpenAI traces when tracing is enabled
- Keep this runbook short and usable by someone who did not build the feature.

### Implementation Targets

- `supabase/migrations/<timestamp>_interview_session_observability.sql`
- `src/lib/ai/voice-agent.ts`
- `src/lib/interview/voice-interview-api.ts`
- `src/lib/interview/voice-interview-client-flow.ts`
- `src/lib/interview/voice-interview-sessions.ts`
- `src/lib/interview/voice-interview-observability.ts`
- `src/app/api/interview/sessions/route.ts`
- `src/app/api/interview/sessions/[sessionId]/telemetry/route.ts`
- `src/hooks/use-voice-interview-agent.ts`

## Relevant OpenAI Guidance

- Realtime session create reference:
  <https://developers.openai.com/api/reference/resources/realtime/subresources/sessions/methods/create/>
- Realtime call accept reference:
  <https://developers.openai.com/api/reference/resources/realtime/subresources/calls/methods/accept/>
- Voice agents:
  <https://developers.openai.com/api/docs/guides/voice-agents/>
- Trace grading / Traces dashboard:
  <https://developers.openai.com/api/docs/guides/trace-grading/>

## Best Practices

- Set tracing at session creation time because current Realtime docs say the
  tracing configuration cannot be modified after it is enabled.
- Use app-owned session ids as the primary operational key even when OpenAI
  tracing exists.
- Log enough to debug behavior, not enough to leak secrets or full prompts.
- Keep operator queries simple: one session id should unlock the whole trail.
- Keep app-owned telemetry useful even when OpenAI tracing is disabled for
  privacy or policy reasons.

## Required Testing

- Successful sessions persist correlation ids, tracing mode, and runtime
  versions.
- Failed sessions still record enough telemetry to debug startup failures.
- Tracing-disabled environments still emit app-owned metrics and logs.
- Client telemetry retries remain idempotent by `eventKey`.
- Log redaction tests confirm secrets, prompt bodies, and raw transcript content
  are not emitted.
- The chosen OpenAI tracing mode is persisted and never mutated after bootstrap.

## Dependencies

- Depends on the server-owned bootstrap path from V1.
- Builds on transcript and debrief persistence from `V2-US-03`.
- Builds on runtime versioning and session policy from `V2-US-04`.
