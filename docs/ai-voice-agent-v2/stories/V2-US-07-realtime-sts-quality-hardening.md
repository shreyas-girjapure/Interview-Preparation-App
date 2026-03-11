# V2-US-07: Realtime Speech-to-Speech Quality Hardening

## Story

As a learner, I want the current speech-to-speech interviewer to understand me
reliably and finish speaking naturally so live mock interviews feel premium
instead of fragile.

## Status

- `Status`: Partially implemented (as of 2026-03-12)
- `Why this exists`: the current Realtime speech-to-speech path is the fastest
  live experience, but it still carries quality risks such as clipped assistant
  audio, premature turn boundaries, device-profile mismatch, and weak
  diagnostics when a session behaves badly.
- `Current baseline`: server-owned env tuning, prompt shaping, trace metadata,
  and session observability are now in place, but the bootstrap contract still
  exposes one Realtime lane with one fixed profile shape instead of a fully
  normalized runtime-quality descriptor.
- `Implementation note`: this story keeps Realtime speech-to-speech as the
  low-latency runtime lane. It does not get replaced by the chained runtime in
  `V2-US-08`; both runtimes should coexist under one shared session contract.
- `Handoff note`: treat the current branch as first-pass tuning plus
  observability. The remaining work is the runtime-profile contract,
  multi-profile support, and fuller quality diagnostics.

### Implemented now (2026-03-12)

- `src/lib/ai/voice-agent.ts` moved model, transcription model, voice,
  `max_output_tokens`, noise reduction, and conservative `server_vad`
  thresholds under server env control, with `interrupt_response: false`.
- `src/lib/env.ts` now validates bounded env overrides for output-token,
  noise-reduction, and VAD tuning instead of relying on browser-owned magic
  constants.
- `buildVoiceInterviewPrompt` now explicitly tells the interviewer to keep
  spoken turns compact but complete so answers finish thoughts instead of
  clipping mid-sentence.
- The session bootstrap and persistence path already record model,
  transcription model, voice, runtime versions, and OpenAI trace metadata on
  the session row.
- Client observability now captures first-assistant-response latency,
  first-assistant-audio latency, `response.done` usage, transcription failures,
  disconnects, and terminal failure/completion events, with persistence through
  the shared `/events` path and session-level cost rollups.
- Tests already cover env-driven runtime tuning plus observability usage
  normalization and estimation.

### Still pending

- Replace the current `{ realtime: ... }` bootstrap payload with a normalized
  runtime descriptor that includes `runtimeKind`, `runtimeProfileId`,
  `profileVersion`, and explicit quality knobs.
- Persist a named runtime quality profile or profile snapshot on the session row
  instead of inferring behavior indirectly from env defaults and model columns.
- Support multiple turn-detection and noise-reduction profiles, including the
  planned `null` noise-reduction mode and any non-`server_vad` experiments.
- Emit explicit diagnostics for output clears, response cancellations or
  truncations, and false-start interruption behavior while assistant audio is
  active.
- Validate premium and fallback profiles across real microphone environments
  before calling the lane hardened.
- Keep the runtime contract aligned with `V2-US-08`; right now the shared
  dual-runtime shape exists in observability types, not in the browser bootstrap
  response.

## Acceptance Criteria

1. The immersive topic and playlist interview routes, the secure session
   bootstrap contract, and the shared live shell remain unchanged for learners.
2. The Realtime bootstrap returns a server-owned runtime quality profile
   instead of relying on hardcoded magic constants in the browser or bootstrap
   helper.
3. The normalized runtime descriptor clearly identifies this lane as
   `realtime_sts` and remains shape-compatible with the chained runtime from
   `V2-US-08`.
4. Assistant speech no longer clips because of an overly low default output
   budget. The premium Realtime profile allows complete interviewer answers
   while still keeping bounded outputs.
5. Turn-detection policy is configurable per runtime profile. The selected
   premium default is intentionally conservative and designed to reduce
   premature interruptions, not maximize aggressiveness.
6. Realtime sessions emit structured quality diagnostics for false starts,
   output clears, response cancellation, transcription failures, first-audio
   latency, and recovery behavior without storing raw audio.
7. The quality profile supports bounded microphone-environment handling via
   server-owned `near_field`, `far_field`, or `null` noise-reduction modes.
8. Prompt instructions for the premium Realtime profile favor complete but
   still compact interviewer turns instead of unnaturally short or self-
   truncating spoken responses.
9. Transcript, persistence, debrief, session policy, and telemetry integrations
   continue to work for the hardened Realtime lane.
10. Server-owned routing can still choose this lane after `V2-US-08` ships; the
    story does not assume the chained runtime becomes the only path.

## Low-Level Solution Design

### Runtime Profile Model

- Introduce a normalized runtime descriptor such as:
  `runtimeKind: "realtime_sts"` plus `runtimeProfileId`.
- The server-owned profile should contain at least:
  `model`, `transcribeModel`, `voice`, `maxOutputTokens`, `turnDetection`,
  `noiseReduction`, `interruptPolicy`, and `profileVersion`.
- Persist runtime-profile metadata on the session row or session snapshot so
  support and observability can explain why a given live session behaved the
  way it did.
- Keep the descriptor aligned with the chained runtime contract so the browser
  can render one shared interview shell regardless of which runtime the server
  selected.

### Turn and Interruption Control

- Remove the single hardcoded `server_vad` assumption from the bootstrap path.
- Evaluate a conservative quality default such as `semantic_vad` or a more
  cautious `server_vad` profile with higher patience.
- Keep an explicit fallback profile for support or staged testing if the chosen
  default proves environment-sensitive.
- Treat user-initiated interruptions as a policy decision, not as an automatic
  side effect of any `speech_started` event while the assistant is speaking.

### Output Quality and Prompting

- Replace the current low `max_output_tokens` default with a premium
  Realtime-specific budget.
- Update the voice prompt so the quality profile asks for complete finished
  thoughts with sentence-bounded brevity instead of aggressively short turns.
- Keep the premium voice server-owned. Start with the current preferred voice
  and keep one tested fallback voice for recovery or A/B verification.

### Diagnostics and Recovery

- Add structured logging or telemetry for:
  - `response.created`, `response.done`, and cancellation or truncation states
  - `output_audio_buffer.started`, `stopped`, and `cleared`
  - `input_audio_buffer.speech_started` while assistant audio is active
  - transcription failure events
  - first assistant audio latency and total assistant audio duration
- If assistant output fails or clears unexpectedly, surface a bounded recovery
  path instead of leaving the user in silent ambiguity.
- Keep diagnostics text- and event-based only. Do not store raw audio.

### Implementation Targets

- `src/lib/ai/voice-agent.ts`
- `src/lib/env.ts`
- `src/lib/interview/voice-interview-prompt.ts`
- `src/hooks/use-voice-interview-agent.ts`
- `src/lib/interview/voice-interview-client-flow.ts`
- `src/app/api/interview/sessions/route.ts`
- `src/app/api/interview/sessions/[sessionId]/telemetry/route.ts` or the final
  telemetry endpoint introduced by `V2-US-05`

## Best Practices

- Fix runtime quality with profile controls and diagnostics, not with prompt
  wording alone.
- Keep all Realtime model, voice, VAD, and interruption defaults server-owned.
- Preserve a strong Realtime lane even after the chained runtime ships. The
  product strategy is dual-runtime, not a one-way migration.
- Validate microphone-environment behavior on both headphones and speaker-based
  setups before calling the profile stable.

## Required Testing

- The bootstrap returns a normalized premium Realtime runtime descriptor.
- Longer assistant answers complete without the current clipped-audio failure
  pattern.
- `speech_started` events during assistant audio are logged and do not
  automatically collapse the response path unless policy says so.
- Quality diagnostics are emitted without raw-audio storage.
- Switching runtime noise-reduction or turn-detection profiles does not break
  the shared live shell or transcript flow.

## Dependencies

- Should align with `V2-US-04` and `V2-US-05` so runtime profiles, policy, and
  diagnostics are server-owned and supportable.
- Can be started before the chained runtime from `V2-US-08`, but both stories
  should eventually share the same runtime descriptor, runtime-selection path,
  and telemetry model.
