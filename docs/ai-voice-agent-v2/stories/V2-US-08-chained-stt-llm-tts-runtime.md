# V2-US-08: Chained STT -> LLM -> TTS Voice Runtime

## Story

As a learner, I want a reliable voice interview runtime that transcribes my
answer, reasons in text, and speaks back through high-quality TTS so the
interviewer feels polished, understandable, and easier to trust when the app
selects a higher-control lane than raw speech-to-speech.

## Status

- `Status`: Draft with shared-contract groundwork in place (as of 2026-03-12)
- `Why this exists`: OpenAI's current voice-agent guidance explicitly
  recommends a predictable chained architecture for voice agents:
  `gpt-4o-transcribe -> gpt-4.1 -> gpt-4o-mini-tts`. The current app does not
  have a second runtime lane besides raw Realtime speech-to-speech.
- `Current baseline`: the browser still opens a Realtime WebRTC session
  directly, but observability and validation already reserve some dual-runtime
  fields for a future chained lane.
- `Implementation note`: this story adds a second runtime lane. It should reuse
  the same immersive shell, transcript model, persistence, and telemetry
  surfaces instead of creating a parallel voice feature. It does not replace
  `realtime_sts`; the product should support both runtime lanes.
- `Sequencing note`: planning and interface design can proceed earlier, but
  runtime implementation should not begin until `V2-US-07` is complete enough
  that the Realtime lane is stable on its own.

### Implemented now (2026-03-12)

- Shared observability types already model
  `VoiceInterviewRuntimeKind = "realtime_sts" | "chained_voice"`.
- Usage-event validation and server rollups already accept future chained usage
  sources: `server_text_response`, `server_audio_transcription`, and
  `server_tts`.
- Session detail and pricing rollup paths can already store and read usage rows
  tagged as `chained_voice`.
- The shared transcript and session persistence surfaces are already generic
  enough that a second runtime can reuse the same stage, transcript, debrief,
  and session-detail flows once a runtime adapter exists.

### Still pending

- `POST /api/interview/sessions` still always bootstraps Realtime and never
  returns a chained runtime descriptor.
- No server-owned runtime-selection policy, feature flag, or profile routing
  exists yet.
- No `POST /api/interview/sessions/[sessionId]/turns` endpoint exists.
- No `src/lib/ai/voice-runtimes/chained-voice.ts` implementation or server
  STT -> text -> TTS orchestration exists.
- No browser adapter exists for committed-turn capture, upload,
  assistant-audio playback, or explicit half-duplex turn flow.
- No chained-runtime transcript, persistence, telemetry, or debrief happy-path
  tests exist.

## Acceptance Criteria

1. The same immersive routes and `POST /api/interview/sessions` contract can
   launch either `realtime_sts` or `chained_voice` without changing learner-
   facing URLs.
2. The server owns runtime selection. The browser never directly chooses raw
   models for the chained runtime.
3. The normalized runtime descriptor is shared with `V2-US-07` so the browser
   can render either lane through one runtime-agnostic shell.
4. A quality-first chained profile exists:
   `gpt-4o-transcribe -> gpt-4.1 -> gpt-4o-mini-tts`.
5. A balanced chained profile exists:
   `gpt-4o-transcribe -> gpt-4.1-mini -> gpt-4o-mini-tts`.
6. The same transcript UI, persistence model, debrief path, and telemetry
   pipeline work for the chained runtime.
7. User transcripts come from the speech-to-text stage, and assistant audio is
   generated from finalized assistant text via TTS. No browser TTS is used.
8. The initial chained runtime is allowed to be explicit turn-based or half-
   duplex, but it must avoid the clipped assistant audio and ambiguous
   speech-boundary issues that motivated this story.
9. Internal preview or feature-flag paths can compare `realtime_sts` and
   `chained_voice` without forking the entire UI.
10. After this story ships, server-owned routing can keep both lanes active for
    different environments, experiments, or recovery policies.

## Low-Level Solution Design

### Runtime Contract

- Extend the bootstrap response with a normalized runtime descriptor such as:
  `runtimeKind`, `runtimeProfileId`, `voice`, `transcribeModel`, `textModel`,
  `ttsModel`, `turnStrategy`, and `profileVersion`.
- Keep model and voice choice server-owned.
- Persist runtime metadata on the session row so quality and cost comparisons
  across runtimes are supportable.
- Keep the descriptor intentionally aligned with `realtime_sts` so the browser
  can stay runtime-agnostic and the server can switch lanes without forking the
  page shell.

### Chained Turn Flow

- The initial chained runtime should be explicit and predictable, not clever.
- Suggested first implementation:
  - browser captures one committed user turn
  - server transcribes the committed audio with `gpt-4o-transcribe`
  - server sends normalized conversation state to the text model
  - server converts the finalized assistant text to audio with
    `gpt-4o-mini-tts`
  - browser plays the returned audio stream or chunks and updates transcript UI
- The first version does not need full-duplex overlapping speech.
- It should optimize for stable interviewer behavior and clean transcripts.

### Transport Shape

- Add a server-owned turn endpoint or stream, for example:
  `POST /api/interview/sessions/[sessionId]/turns`.
- The request should carry committed user audio plus lightweight turn metadata.
- The response should carry or stream:
  - finalized user transcript
  - assistant text
  - assistant audio chunks or a stream handle
  - failure or retry metadata
- Keep the shared live shell and transcript item model runtime-agnostic.

### Prompt and Conversation State

- Reuse the same resolved scope snapshot and prompt builder across runtimes.
- Add runtime-specific prompt shaping only where it materially improves TTS
  chunking, completion quality, or transcript clarity.
- Because the assistant text exists explicitly in this runtime, enforce clear
  sentence boundaries before audio generation.

### Voice and TTS

- Use `gpt-4o-mini-tts`.
- Start with one default voice and keep one fallback voice verified during
  testing.
- Keep TTS tone instructions server-owned so the interviewer remains calm,
  direct, and consistent with the product voice.

### Runtime Comparison and Rollout

- Do not remove the hardened Realtime speech-to-speech lane from `V2-US-07`.
- Treat the chained runtime as a second first-class lane, not an automatic
  replacement path.
- Add feature flags or preview hooks that map to server-owned runtime
  selection.
- Reuse the same persistence, session policy, and telemetry surfaces so
  runtime-quality and cost comparisons stay apples-to-apples.

### Implementation Targets

- `src/app/api/interview/sessions/route.ts`
- `src/app/api/interview/sessions/[sessionId]/turns/route.ts`
- `src/lib/ai/voice-runtimes/chained-voice.ts`
- `src/lib/ai/audio/` helpers for committed-turn upload and TTS playback
- `src/hooks/use-voice-interview-agent.ts` or a shared runtime adapter layer
- `src/lib/interview/voice-interview-runtime.ts`
- `src/lib/interview/voice-interview-session.ts`

## Best Practices

- Keep the same shell and transcript contract across runtimes.
- Preserve the best transcription model first. Step down the text model before
  stepping down STT or TTS quality.
- Start with predictable turn-based behavior before experimenting with more
  aggressive overlapping interaction.
- Keep the browser thin. The server should own runtime choice and voice policy.
- Design this lane so it can coexist with `realtime_sts` for a long time, not
  only as a migration target.

## Required Testing

- The bootstrap returns a normalized `chained_voice` runtime descriptor.
- The shared immersive shell can launch and complete a chained runtime session.
- The committed-turn endpoint returns a finalized transcript plus assistant
  audio without using browser TTS.
- The quality-first and balanced chained profiles differ only in the chosen
  text model unless a later story explicitly expands the comparison.
- Transcript persistence, debrief generation, and telemetry continue to work
  for chained sessions.

## Dependencies

- Reuses the persistence and debrief contract from `V2-US-03`.
- Reuses the session policy model from `V2-US-04`.
- Reuses the observability and runtime-versioning path from `V2-US-05`.
- Should not move into implementation before `V2-US-07` reaches a stable,
  supportable baseline, unless product priorities are explicitly changed.
- Should be designed alongside `V2-US-07` so both runtimes share one
  normalized runtime descriptor, routing model, and comparison model.
