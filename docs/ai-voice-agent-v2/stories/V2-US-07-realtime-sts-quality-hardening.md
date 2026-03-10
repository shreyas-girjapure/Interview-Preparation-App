# V2-US-07: Realtime Speech-to-Speech Quality Hardening

## Story

As a learner, I want the current speech-to-speech interviewer to understand me
reliably and finish speaking naturally so live mock interviews feel premium
instead of fragile.

## Status

- `Status`: Draft
- `Why this exists`: the current Realtime speech-to-speech path is the fastest
  live experience, but it still carries quality risks such as clipped assistant
  audio, premature turn boundaries, device-profile mismatch, and weak
  diagnostics when a session behaves badly.
- `Current baseline`: the bootstrap still hardcodes a low output-token budget,
  a fixed `server_vad` profile, and a fixed noise-reduction default in
  `src/lib/ai/voice-agent.ts`, while the prompt also biases very short spoken
  turns.
- `Implementation note`: this story keeps Realtime speech-to-speech as the
  premium runtime lane. It does not replace that path with the chained runtime
  introduced in `V2-US-08`.

## Acceptance Criteria

1. The immersive topic and playlist interview routes, the secure session
   bootstrap contract, and the shared live shell remain unchanged for learners.
2. The Realtime bootstrap returns a server-owned runtime quality profile
   instead of relying on hardcoded magic constants in the browser or bootstrap
   helper.
3. Assistant speech no longer clips because of an overly low default output
   budget. The premium Realtime profile allows complete interviewer answers
   while still keeping bounded outputs.
4. Turn-detection policy is configurable per runtime profile. The selected
   premium default is intentionally conservative and designed to reduce
   premature interruptions, not maximize aggressiveness.
5. Realtime sessions emit structured quality diagnostics for false starts,
   output clears, response cancellation, transcription failures, first-audio
   latency, and recovery behavior without storing raw audio.
6. The quality profile supports bounded microphone-environment handling via
   server-owned `near_field`, `far_field`, or `null` noise-reduction modes.
7. Prompt instructions for the premium Realtime profile favor complete but
   still compact interviewer turns instead of unnaturally short or self-
   truncating spoken responses.
8. Transcript, persistence, debrief, session policy, and telemetry integrations
   continue to work for the hardened Realtime lane.

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
- Preserve a premium Realtime lane even after the chained runtime ships.
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
  should eventually share the same runtime descriptor and telemetry model.
