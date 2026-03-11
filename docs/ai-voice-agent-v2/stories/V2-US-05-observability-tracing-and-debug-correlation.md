# V2-US-05: Observability, Tracing, Debug Correlation, and Session Cost Accounting

## Story

As the app owner, I need a single interview session to be traceable across app
logs, metrics, OpenAI runtime identifiers, and cost signals so support,
debugging, and spend analysis do not depend on guesswork.

## Status

- `Status`: Ready for implementation
- `Why this exists`: V1 captures useful timing data locally, but today that
  data is mostly development-only and is not yet correlated with durable
  session diagnostics or session-level cost signals.
- `Current baseline`: the client already measures bootstrap and connect timings,
  the session row already stores `openai_session_id`, and the Realtime bootstrap
  currently sets `tracing: null`. The client transport can already observe raw
  Realtime events such as `response.done` and
  `conversation.item.input_audio_transcription.completed`, and the installed
  OpenAI SDK supports both `auto` and structured tracing metadata. The app does
  not yet persist durable telemetry events, usage events, or per-session cost
  estimates.
- `Implementation note`: this story should promote the existing timing and
  session-id baseline into durable structured telemetry and cost accounting
  without dumping raw prompts, raw transcript text, or client secrets into
  logs.

### Scope Note for Cost Accounting

- This story is only about `session-level estimated cost`.
- Organization-level usage or cost reporting is out of scope for this story
  because operators can inspect that directly in the OpenAI dashboard when
  needed.
- The current OpenAI organization usage and costs APIs are still useful for
  external audit and reconciliation, but they are bucketed by time and
  organization or project dimensions, not by our local
  `interview_sessions.id`.
- Based on the current OpenAI APIs, upstream billing is not exposed by our
  local `interview_sessions.id`, so session cost must be an app-owned rollup
  built from usage captured during the session and priced against a versioned
  pricing snapshot.
- The output of this story should answer one concrete support question:
  `How much did this specific interview session likely cost, and why?`

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
7. The app persists immutable usage events and a mutable session rollup so
   operators can inspect both per-event detail and the latest session total.
8. Session cost estimation stores the runtime kind, model, service tier, and
   rate snapshot used for the calculation.
9. For `realtime_sts`, usage captured from `response.done` and
   `conversation.item.input_audio_transcription.completed` is sufficient to
   produce a bounded per-session estimated cost for conversational responses and
   input transcription.
10. Transcription estimates correctly handle token-based pricing for audio input
    plus text input or output when those usage fields are present, and can
    tolerate duration-shaped usage if a provider path returns it later.
11. The story does not depend on OpenAI organization usage or costs APIs to
    answer session-level cost questions.
12. Sensitive data is not dumped into normal logs, telemetry payloads, or cost
    records.
13. Operators have a documented path for debugging a failed or slow session and
    for explaining roughly what that session cost.

## Low-Level Solution Design

### Data Model

- Extend `interview_sessions` with observability fields such as:
  `openai_trace_enabled`, `openai_trace_mode`, `openai_trace_group_id`,
  `openai_trace_workflow_name`, `openai_trace_metadata_json`,
  `runtime_environment`,
  `last_disconnect_reason`, `retry_count`, `telemetry_updated_at`,
  and `diagnostics_json`.
- Extend `interview_sessions` with cost and usage rollup fields such as:
  `estimated_cost_usd`, `estimated_cost_currency`, `cost_status`,
  `cost_estimated_at`, `last_usage_recorded_at`, `usage_summary_json`,
  `cost_breakdown_json`, `cost_rate_snapshot_json`, and `cost_notes_json`.
- Reuse the runtime version fields introduced in `V2-US-04`.
- Add a dedicated telemetry table such as `interview_session_events`:
  `id`, `session_id`, `event_key`, `event_name`, `event_source`,
  `attempt_number`, `recorded_at`, `duration_ms`, `payload_json`,
  `created_at`.
- Add a unique constraint on `(session_id, event_key)` so singleton telemetry
  events can be retried idempotently.
- Add an index on `(session_id, recorded_at)`.
- Add a dedicated usage ledger such as `interview_session_usage_events`:
  `id`, `session_id`, `usage_key`, `usage_source`, `provider`,
  `runtime_kind`, `model`, `service_tier`, `recorded_at`,
  `provider_usage_json`, `normalized_usage_json`, `rate_snapshot_json`,
  `estimated_cost_usd`, `currency`, `created_at`, and `updated_at`.
- Add a unique constraint on `(session_id, usage_key)` so usage writes are
  idempotent even when the browser retries.
- Add an index on `(session_id, recorded_at)`.
- Keep the session row compact. Operators should use the session row for the
  latest summary and the usage table for the detailed trail.

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

### Usage and Cost Event Model

- Keep billing-relevant usage separate from generic telemetry.
- Use a normalized usage vocabulary such as:
  `realtime_response`
  `realtime_input_transcription`
  `server_text_response`
  `server_audio_transcription`
  `server_tts`
- `realtime_response` events should preserve the usage payload returned by the
  Realtime `response.done` event and normalize the parts needed for cost math,
  such as:
  `inputTextTokens`, `inputCachedTextTokens`, `outputTextTokens`,
  `inputAudioTokens`, `inputCachedAudioTokens`, `outputAudioTokens`, and
  `serviceTier` when available.
- `realtime_input_transcription` events should preserve the usage payload from
  `conversation.item.input_audio_transcription.completed` and normalize the
  transcription usage needed for cost math.
- For later `chained_voice`, preserve a runtime-agnostic usage shape that can
  also represent server-side STT, text generation, and TTS usage even if those
  services use different units such as tokens, seconds, or characters.
- Keep the raw provider payload in `usage_json` for auditability, but also
  store a normalized rollup on the session row so operators do not have to
  replay every event to answer simple cost questions.

### Write Paths

- Add a server helper such as
  `recordInterviewSessionEvent({ sessionId, eventKey, eventName, ... })`.
- Add a server helper such as
  `recordInterviewSessionUsage({ sessionId, usageKey, usageSource, ... })`.
- Add `POST /api/interview/sessions/[id]/telemetry` for client-originated
  events that occur after the initial bootstrap request.
- Emit server-originated events directly from server routes and helpers:
  - bootstrap success or failure in `POST /api/interview/sessions`
  - terminal events in `V2-US-03` complete or cancel routes
  - force-end or heartbeat-related policy events from `V2-US-04`
- Keep the telemetry endpoint idempotent by requiring client-supplied
  `eventKey` and `usageKey` values.
- The same endpoint may accept both `events` and `usageEvents`, or usage may be
  split into a dedicated route if that keeps validation cleaner. Either design
  is acceptable as long as the server remains the pricing authority.

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
  usageEvents?: Array<{
    usageKey: string;
    usageSource:
      | "realtime_response"
      | "realtime_input_transcription"
      | "server_text_response"
      | "server_audio_transcription"
      | "server_tts";
    runtimeKind?: "realtime_sts" | "chained_voice";
    model?: string | null;
    serviceTier?: string | null;
    recordedAt: string;
    usage: Record<string, number | string | boolean | null>;
    rawUsage?: Record<string, unknown>;
  }>;
};
```

### Session Cost Accounting

- Treat pricing as a server-owned DB table, not a live scrape.
- Add a simple table such as `public.voice_interview_pricing_rates` with one
  row per current billable usage type.
- For `realtime_sts`, estimate session cost by combining:
  - Realtime response usage captured from `response.done`
  - input transcription usage captured from
    `conversation.item.input_audio_transcription.completed`
  - the current admin-managed pricing rows for the active model and service
    tier
- Recalculate or update the session rollup whenever a new usage event arrives.
- Mark session `cost_status` as something like:
  `pending`, `estimated`, or `estimate_failed`.
- Do not block interview completion on cost estimation. If pricing math fails,
  keep the session usable and record a bounded cost failure state.

### Pricing Source and Refresh Policy

- Source of truth for rates:
  - the official OpenAI pricing page
  - the relevant official model pages when they expose modality-specific token
    prices
  - the official Realtime cost guide for how usage should be interpreted
- Do not fetch pricing from the internet at request time.
- Instead admins should update the DB table manually when pricing or model
  choices change.
- This story intentionally avoids pricing-history tables. The tradeoff is that
  old sessions are not meant to be automatically recomputed after rates change.
- Pricing refresh policy:
  - update the table when we change the runtime model
  - update the table when OpenAI pricing changes
  - otherwise leave the current rows alone

### Initial Pricing Snapshot for Current Runtime Defaults

- The current repo defaults in `src/lib/env.ts` are:
  - `OPENAI_REALTIME_MODEL = gpt-realtime`
  - `OPENAI_REALTIME_TRANSCRIBE_MODEL = gpt-4o-mini-transcribe`
- As of `2026-03-11`, the official OpenAI pricing sources show:
  - `gpt-realtime` text input: `$4.00 / 1M tokens`
  - `gpt-realtime` cached text input: `$0.40 / 1M tokens`
  - `gpt-realtime` text output: `$16.00 / 1M tokens`
  - `gpt-realtime` audio input: `$32.00 / 1M tokens`
  - `gpt-realtime` cached audio input: `$0.40 / 1M tokens`
  - `gpt-realtime` audio output: `$64.00 / 1M tokens`
  - `gpt-4o-mini-transcribe` audio input: `$3.00 / 1M tokens`
- These values should be seeded into the pricing table as the first local
  default rows, unless the official pricing changes before implementation.

### Cost Formula

- For each normalized `realtime_response` usage event, estimate cost as:

```ts
responseCostUsd =
  inputTextTokens * rates.realtime.textInputPerToken +
  inputCachedTextTokens * rates.realtime.cachedTextInputPerToken +
  outputTextTokens * rates.realtime.textOutputPerToken +
  inputAudioTokens * rates.realtime.audioInputPerToken +
  inputCachedAudioTokens * rates.realtime.cachedAudioInputPerToken +
  outputAudioTokens * rates.realtime.audioOutputPerToken;
```

- For each normalized `realtime_input_transcription` usage event, estimate cost
  as:

```ts
transcriptionCostUsd =
  transcriptionInputAudioTokens * rates.transcription.audioInputPerToken;
```

- Session estimated cost is then:

```ts
estimatedSessionCostUsd = sum(responseCostUsd) + sum(transcriptionCostUsd);
```

- Compute incrementally when usage events arrive so the session row stays
  current while live.
- Recompute once more on `complete`, `cancel`, or `force-end` so terminal
  sessions have a final stable estimate.

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
- Capture usage-bearing Realtime events in the client while the browser still
  owns the session transport:
  - `response.done` for conversational response usage
  - `conversation.item.input_audio_transcription.completed` for input
    transcription usage
- Convert those raw SDK events into normalized `usageEvents` and flush them to
  the server idempotently.

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

### Session Reporting

- `GET /api/interview/sessions/[id]` should eventually be able to return the
  session usage rollup and estimated session cost alongside transcript and
  debrief data.
- Operators should not need separate dashboards to answer a single-session cost
  question.
- If the app later moves some traffic to `chained_voice`, keep the session cost
  shape runtime-agnostic so operators can compare both lanes apples-to-apples.

### Operator Runbook

- Add a support runbook in docs or code comments with this path:
  1. start from local `interview_sessions.id`
  2. inspect session state, runtime versions, and tracing mode
  3. inspect `openai_session_id`
  4. inspect ordered telemetry events for startup, disconnect, persistence, and
     completion
  5. inspect session usage rollups and estimated cost fields
  6. inspect transcript or debrief persistence status from `V2-US-03`
  7. inspect OpenAI traces when tracing is enabled
- Keep this runbook short and usable by someone who did not build the feature.

### Implementation Targets

- `supabase/migrations/<timestamp>_interview_session_observability.sql`
- `supabase/migrations/<timestamp>_voice_interview_pricing_rates.sql`
- `supabase/seed.sql`
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
- Realtime cost guide:
  <https://developers.openai.com/api/docs/guides/realtime-costs/>
- Voice agents:
  <https://developers.openai.com/api/docs/guides/voice-agents/>
- Trace grading / Traces dashboard:
  <https://developers.openai.com/api/docs/guides/trace-grading/>
- OpenAI API pricing:
  <https://openai.com/api/pricing/>
- `gpt-realtime` model page:
  <https://platform.openai.com/docs/models/gpt-realtime>
- `gpt-4o-mini-transcribe` model page:
  <https://platform.openai.com/docs/models/gpt-4o-mini-transcribe>

## Best Practices

- Set tracing at session creation time because current Realtime docs say the
  tracing configuration cannot be modified after it is enabled.
- Use app-owned session ids as the primary operational key even when OpenAI
  tracing exists.
- Keep pricing server-owned and versioned. Do not calculate spend from an
  unversioned live scrape of pricing pages at request time.
- Keep the cost story honest: this is a session-level estimate derived from
  captured usage and the current admin-managed pricing rows.
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
- Usage-event retries remain idempotent by `usageKey`.
- Realtime response and transcription usage roll up into a stable per-session
  estimate without double counting.
- Manual pricing-row edits do not silently backfill previously stored session
  cost totals.
- Log redaction tests confirm secrets, prompt bodies, and raw transcript content
  are not emitted.
- The chosen OpenAI tracing mode is persisted and never mutated after bootstrap.

## Dependencies

- Depends on the server-owned bootstrap path from V1.
- Builds on transcript and debrief persistence from `V2-US-03`.
- Builds on runtime versioning and session policy from `V2-US-04`.
