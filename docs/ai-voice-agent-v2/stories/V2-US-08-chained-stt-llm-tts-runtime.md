# V2-US-08: Chained STT -> LLM -> TTS Voice Runtime

## Story

As a learner, I want a reliable voice interview runtime that transcribes my
answer, reasons in text, and speaks back through high-quality TTS so the
interviewer feels polished, understandable, and easier to trust when the app
selects a higher-control lane than raw speech-to-speech.

## Status

- `Status`: Prioritized for implementation; implementation-ready plan drafted
  around the current codebase (as of 2026-03-12)
- `Why this exists`: OpenAI's current voice-agent guidance recommends a
  predictable chained architecture for teams that want higher control,
  explicit transcripts, and reliable server-owned orchestration. The voice
  guide still illustrates this with
  `gpt-4o-transcribe -> gpt-4.1 -> gpt-4o-mini-tts`, but this story should use
  the best current OpenAI models that fit a live interview turn budget.
- `Product position`: this story adds a second first-class runtime lane. It
  does not replace `realtime_sts`; the product should support both lanes and
  expose both as named choices in the frontend.
- `Implementation note`: the first shipping slice should be deliberately simple
  and supportable with the existing frontend shell and Supabase-backed session
  model. Do not start with full duplex, browser-side TTS, or streaming audio
  chunk assembly.
- `Sequencing note`: this story has now been explicitly pulled forward ahead of
  the remaining `V2-US-07` hardening work. Keep the shared runtime descriptor
  aligned with Realtime, but do not treat full `V2-US-07` completion as the
  implementation gate.

### Research Basis

- OpenAI's current voice-agent guide recommends the chained architecture for
  new voice-agent implementations that need control and transparency.
- OpenAI's January 2026 changelog says to prefer
  `gpt-4o-mini-transcribe` over `gpt-4o-transcribe` for the best STT results.
- OpenAI's model guide now says to start with `gpt-5.4` when you want the
  flagship text model, and to use `gpt-5-mini` when you want lower latency and
  cost.
- OpenAI's Transcriptions API accepts committed audio files over
  `multipart/form-data` and returns finalized transcript text plus usage data.
  Streaming transcription exists, but it is not required for the first pass.
- OpenAI's Speech API is synchronous HTTP and expects finalized text before TTS
  generation. That naturally favors an explicit half-duplex first version.
- OpenAI's Speech API supports `mp3`, `opus`, `aac`, `flac`, `wav`, and `pcm`
  output. For the first shipping slice, `mp3` is the simplest return format
  for short interviewer turns.

### Best-current model policy (2026-03-12)

- `STT default`: `gpt-4o-mini-transcribe`
- `TTS default`: `gpt-4o-mini-tts`
- `Premium text model`: `gpt-5.4` with `reasoning.effort: "none"` so the
  chained lane keeps a live-feeling turn budget instead of drifting into a
  heavy reasoning path.
- `Balanced text model`: `gpt-5-mini`
- `Explicit non-choice`: do not use `gpt-5-pro` for normal live interview
  turns. OpenAI's model docs say some requests may take several minutes, which
  is incompatible with this experience.
- `Versioning rule`: keep the runtime profile server-owned and versioned so the
  app can pin snapshots or roll forward safely after evals.

### Implemented now (2026-03-12)

- Shared observability types already model
  `VoiceInterviewRuntimeKind = "realtime_sts" | "chained_voice"`.
- Usage-event validation and server rollups already accept future chained usage
  sources: `server_text_response`, `server_audio_transcription`, and
  `server_tts`.
- Session detail and pricing rollup paths can already store and read usage rows
  tagged as `chained_voice`.
- The immersive shell, transcript model, persistence reads, and debrief flow
  are already generic enough to support a second runtime lane.
- The app already ships the official `openai` SDK and already has a server-side
  OpenAI singleton pattern in `src/lib/ai/voice-agent.ts`.

### Current codebase constraints

- `POST /api/interview/sessions` still always returns a Realtime-specific
  payload shaped as `{ clientSecret, realtime }`.
- `useVoiceInterviewAgent` is Realtime-first and directly instantiates
  `OpenAIRealtimeWebRTC`; it is not a runtime router yet.
- The current stage control surface only supports `start`, `cancel setup`,
  `mute`, `retry`, and `end`. There is no committed-turn action yet.
- There is no frontend runtime picker yet; the learner cannot currently choose
  between `realtime_sts` and `chained_voice`.
- Live Realtime transcript persistence is currently client-driven through the
  shared `/events` path. That pattern is not the simplest way to run a server-
  owned chained lane.
- Session persistence stores Realtime model, transcription model, and voice,
  but not a normalized runtime kind, runtime profile id, text model, or TTS
  model snapshot.

### Still pending

- No server-owned runtime-selection policy, feature flag, or profile routing
  exists yet.
- No normalized runtime descriptor exists in
  `src/lib/interview/voice-interview-api.ts`.
- No `POST /api/interview/sessions/[sessionId]/turns` endpoint exists.
- No `src/lib/ai/voice-runtimes/chained-voice.ts` implementation exists.
- No browser adapter exists for committed-turn capture, upload, assistant-audio
  playback, or half-duplex turn state.
- No chained-runtime happy-path tests exist across bootstrap, turn execution,
  persistence, and session completion.

### Turn terminology

- A `turn` means one finalized contribution from one speaker.
- A learner answer is one `user turn`.
- One interviewer reply is one `assistant turn`.
- In the chained runtime, one full interaction cycle is:
  user speech -> transcription -> text generation -> TTS -> assistant playback.
- So `POST /turns` means: "submit one completed learner answer and get back one
  completed interviewer reply."

## Recommended First Shipping Slice

Ship a simple dual-runtime experience through the existing immersive route and
shell:

1. The learner opens the same topic interview route.
2. Before start, the learner can choose `Realtime voice` or `Chained voice`.
3. The browser sends that choice as a named `runtimePreference`.
4. The server validates the preference, applies it when supported, and falls
   back safely when it is not.
5. If `chained_voice` is selected, the browser should still feel live:
   keep the mic active, detect end-of-speech locally, auto-commit the user
   answer, then play the returned TTS reply immediately.
6. The server persists user and assistant turns during the turn request itself.
7. The browser reuses the same transcript panel, session detail route,
   observability pipeline, and debrief flow.

This first slice should be:

- half-duplex
- explicit turn-based under the hood
- live-feeling on the surface
- auto-commit on silence as the primary chained interaction mode
- server-owned
- transcript-first
- no raw audio storage
- no browser TTS
- no multipart response streaming

## Acceptance Criteria

1. The same immersive routes and `POST /api/interview/sessions` entry point can
   launch either `realtime_sts` or `chained_voice` without changing learner-
   facing URLs.
2. The frontend exposes both runtime lanes as named user choices, for example
   `Realtime voice` and `Chained voice`.
3. The browser may request a named runtime lane, but it does not choose raw
   model ids or server voice policy directly. The server validates the choice
   and can fall back if the request is unsupported.
4. The bootstrap returns a normalized runtime descriptor shared with
   `V2-US-07`, plus transport-specific details for either Realtime WebRTC or
   server turns.
5. A premium chained profile exists:
   `gpt-4o-mini-transcribe -> gpt-5.4 -> gpt-4o-mini-tts`.
6. A balanced chained profile exists:
   `gpt-4o-mini-transcribe -> gpt-5-mini -> gpt-4o-mini-tts`.
7. The same transcript UI, session-detail route, persistence model, debrief
   path, and telemetry rollups work for `chained_voice`.
8. User transcript text comes from server STT, and assistant audio comes from
   server TTS. No browser TTS is used.
9. The first chained runtime remains half-duplex internally, but the learner
   experience should still feel live by using automatic turn commit after short
   silence, fast server response budgets, and immediate TTS playback.
10. Unsupported browser environments do not strand the learner on a broken lane.
    If the browser cannot support committed-turn capture, server routing falls
    back to `realtime_sts`.
11. Internal preview or feature-flag paths can compare `realtime_sts` and
    `chained_voice` without forking the entire UI.
12. The chained lane does not use `gpt-5-pro` or any similarly long-running
    text profile in the normal live interview path.

## Implementation Plan

### 1. Normalize the bootstrap contract first

- Replace the current Realtime-only bootstrap response with a normalized
  contract in `src/lib/interview/voice-interview-api.ts`.
- Keep one top-level `localSession` object, then return:
  - `runtime`: normalized runtime descriptor
  - `transport`: runtime-specific transport details
  - `timingsMs`
- Add a named runtime preference to the bootstrap request, for example:
  `runtimePreference?: "auto" | "realtime_sts" | "chained_voice"`.
- Add an optional capability report so the browser can tell the server whether
  `MediaRecorder` exists and which MIME types it can produce.
- Use the browser preference as a named lane request, not as raw model
  selection. The server remains responsible for validating the request and
  selecting the actual runtime profile.

Recommended response shape:

```ts
type VoiceInterviewRuntimeDescriptor = {
  kind: "realtime_sts" | "chained_voice";
  selectionSource: "auto_policy" | "user_preference" | "fallback";
  profileId: string;
  profileVersion: string;
  transport: "realtime_webrtc" | "server_turns";
  turnStrategy:
    | "server_vad_full_duplex"
    | "client_vad_half_duplex"
    | "manual_commit_half_duplex";
  voice: string;
  models: {
    realtime?: string;
    transcribe?: string;
    text?: string;
    tts?: string;
  };
};
```

Recommended chained transport shape:

```ts
type ChainedVoiceTransport = {
  type: "server_turns";
  acceptedMimeTypes: string[];
  maxTurnSeconds: number;
  playbackFormat: "mp3";
  turnsPath: string;
  autoCommitSilenceMs: number;
};
```

Recommended Realtime transport shape:

```ts
type RealtimeWebRtcTransport = {
  type: "realtime_webrtc";
  clientSecret: {
    expiresAt: number;
    value: string;
  };
  openAiSessionId: string | null;
};
```

### 2. Add a server-owned chained runtime module

- Create `src/lib/ai/voice-runtimes/chained-voice.ts`.
- Extract the server OpenAI client singleton from
  `src/lib/ai/voice-agent.ts` into a shared helper, for example
  `src/lib/ai/server-openai.ts`, so Realtime bootstrap and chained turns use
  the same client construction logic.
- Do not build the first version around in-memory session state. This app is a
  Next.js plus Supabase deployment, so the supportable path is:
  - read persisted transcript rows for the session
  - rebuild prompt context on each turn
  - persist the new turn before returning

Recommended server turn orchestration:

1. validate session ownership and session state
2. accept committed audio as `multipart/form-data`
3. transcribe with `openai.audio.transcriptions.create`
4. build the text prompt from scope snapshot plus persisted transcript
5. generate assistant text with `openai.responses.create`
6. normalize the assistant text for spoken delivery
7. synthesize TTS with `openai.audio.speech.create`
8. persist transcript rows, telemetry, and usage events
9. return finalized user turn, finalized assistant turn, and assistant audio

Recommended chained model profiles:

- `chained_voice_premium`
  - `transcribe`: `gpt-4o-mini-transcribe`
  - `text`: `gpt-5.4`
  - `reasoning.effort`: `none`
  - `tts`: `gpt-4o-mini-tts`
- `chained_voice_balanced`
  - `transcribe`: `gpt-4o-mini-transcribe`
  - `text`: `gpt-5-mini`
  - `tts`: `gpt-4o-mini-tts`

Why this split:

- OpenAI's models guide says to start with `gpt-5.4` when unsure and to use
  `gpt-5-mini` when optimizing for latency and cost.
- OpenAI's migration guidance says `gpt-5.4` with `reasoning.effort: "none"`
  is the right starting replacement for `gpt-4.1`, and `gpt-5-mini` is a
  strong replacement for `gpt-4.1-mini`.
- That gives us one flagship profile and one live-friendly profile without
  moving back to the older 4.1 family unless evals prove it is better for this
  product.

### 3. Keep the first turn endpoint simple

- Add `POST /api/interview/sessions/[sessionId]/turns`.
- Request format for v1:
  - `multipart/form-data`
  - `audio` file
  - `clientTurnId`
  - optional timing fields such as `recordStartedAt` and `recordEndedAt`
  - `mimeType`
- Response format for v1 should stay JSON, not multipart mixed:
  - finalized user transcript item
  - finalized assistant transcript item
  - assistant `audioBase64`
  - `audioMimeType`
  - usage events
  - timing breakdown

Recommended response shape:

```ts
type CreateInterviewTurnResponse = {
  ok: true;
  runtimeKind: "chained_voice";
  userTranscriptItem: VoiceInterviewPersistedTranscriptItem;
  assistantTranscriptItem: VoiceInterviewPersistedTranscriptItem;
  assistantAudio: {
    base64: string;
    mimeType: "audio/mpeg";
    voice: string;
  };
  timingsMs: {
    total: number;
    transcription: number;
    text: number;
    tts: number;
  };
};
```

Why JSON plus base64 for v1:

- interviewer turns are intentionally short
- it avoids multipart response complexity
- it keeps the browser adapter very small
- it avoids temporary file storage

If payload size becomes a real issue later, move to streamed audio or a signed
ephemeral file URL in a follow-up story.

For `feel like realtime`:

- v1 should keep the reply short and start playback immediately after the
  server responds.
- That is enough for a near-realtime feel when combined with automatic silence
  commit.
- If the product later needs even tighter responsiveness, a follow-up can
  stream LLM text by sentence and synthesize sentence chunks incrementally.

### 4. Reuse the current shell with one runtime-aware control change

- Keep `VoiceInterviewShell` and `LiveTranscriptPanel`.
- Do not build a new page shell for chained voice.
- Add a small frontend runtime picker before session start, for example a
  segmented control or dropdown above the stage.
- Update `VoiceStage` so the center action is runtime-aware instead of
  assuming Realtime mute behavior during every live session.

Recommended live control behavior:

- `realtime_sts`
  - keep current mute/unmute behavior
- `chained_voice`
  - primary mode: auto-listen and auto-submit on silence
  - center action: pause/resume mic or "send now" fallback
  - processing: disabled spinner state
  - playing: disabled speaking state

Important frontend call:

- Do not make tap-to-send the primary chained experience.
- The chained lane should feel conversational, so the default mode should be
  `MediaRecorder` plus lightweight client-side silence detection.
- A small manual `send now` fallback is acceptable if auto-end misses the
  boundary.
- Do not add full push-to-talk or full duplex in v1.

### 5. Introduce a runtime adapter layer in the hook

- Keep `useVoiceInterviewAgent` as the public hook used by the route.
- Refactor it into:
  - bootstrap plus runtime selection
  - `useRealtimeVoiceInterviewRuntime`
  - `useChainedVoiceInterviewRuntime`
- Keep the returned shell-facing surface mostly shared:
  - `session`
  - `stage`
  - transcript items
  - `start`, `retry`, `end`
  - runtime-aware primary action

The important design constraint is that the shell should not care whether the
assistant audio came from WebRTC or a hidden audio element playing a returned
MP3 blob.

### 6. Persist server-created turns on the turn route itself

- For `chained_voice`, do not rely on the browser to flush transcript items for
  the main happy path.
- The turn route should:
  - persist finalized transcript rows
  - record usage rows
  - record server timing and failure telemetry
- The browser then only needs to:
  - update local transcript UI from the response
  - play returned assistant audio
  - continue using `/complete`, `/cancel`, `/heartbeat`, and session detail

This keeps the server-owned lane actually server-owned and makes the next turn
supportable from database state alone.

### 7. Reuse the current prompt first, then layer follow-on stories

- Reuse `buildVoiceInterviewPrompt(scope)` as the stable interviewer policy for
  the first shipping slice.
- Add a small helper that converts persisted transcript rows into a bounded
  text-model context.
- Do not block this story on `V2-US-10` or `V2-US-11`.
- Design the chained runtime so those stories can plug into the explicit text
  generation step later.

Recommended first-pass text input:

- system prompt from `buildVoiceInterviewPrompt(scope)`
- prior finalized transcript turns
- newest user transcript
- short instruction to produce one concise spoken interviewer reply

### 8. Extend session metadata for cross-runtime support

- Add or persist normalized runtime metadata on the session row:
  - `runtime_kind`
  - `runtime_profile_id`
  - `runtime_profile_version`
  - `openai_text_model`
  - `openai_tts_model`
- Keep existing Realtime metadata fields.
- Add a chained trace workflow name, for example
  `voice-interview-chained-voice`.
- Store the selected runtime descriptor inside `diagnostics_json.bootstrap` so
  support can see which lane and profile were used.

### 9. Add small, explicit env controls

- Extend `src/lib/env.ts` and `.env.example` with bounded server-owned defaults
  for:
  - frontend runtime chooser default
  - chained default voice
  - chained transcribe model
  - chained premium text model
  - chained balanced text model
  - chained TTS model
  - chained premium reasoning effort
  - max committed turn seconds
  - chained auto-commit silence window
- Keep model selection server-owned even when the frontend exposes runtime
  choice. The browser chooses a named lane, not the underlying models.

## Non-Goals For This Story

- no full-duplex chained runtime
- no overlapping user and assistant speech
- no browser TTS fallback
- no raw audio storage in Supabase or object storage
- no in-memory server conversation cache that becomes deployment-sensitive
- no transcript-delta streaming requirement
- no grounded documentation search requirement yet
- no answer-interpretation layer requirement yet

## Implementation Targets

- `src/app/api/interview/sessions/route.ts`
- `src/app/api/interview/sessions/[sessionId]/turns/route.ts`
- `src/app/api/interview/sessions/_lib/schemas.ts`
- `src/lib/interview/voice-interview-api.ts`
- `src/lib/ai/server-openai.ts`
- `src/lib/ai/voice-runtimes/chained-voice.ts`
- `src/lib/interview/voice-interview-runtime.ts`
- `src/lib/interview/voice-interview-session.ts`
- `src/lib/interview/voice-interview-sessions.ts`
- `src/hooks/use-voice-interview-agent.ts`
- `src/components/voice-interview/voice-stage.tsx`
- `src/lib/env.ts`

## Best Practices

- Keep the same shell and transcript contract across runtimes.
- Treat frontend choice as a named runtime preference, not a raw model picker.
- Preserve the best transcription model first. Step down the text model before
  stepping down STT or TTS quality.
- Pin `gpt-5.4` with `reasoning.effort: "none"` for live turns instead of
  accepting heavier default reasoning behavior by accident.
- Keep chained voice half-duplex internally, but make it feel live with
  automatic silence commit, short replies, and immediate playback.
- Keep the browser thin. The server should own runtime choice, voice policy,
  and turn orchestration.
- Rebuild turn context from persisted transcript rows instead of relying on
  process memory.
- Design this lane so it can coexist with `realtime_sts` for a long time, not
  only as a migration path.
- Do not use `gpt-5-pro` in the main turn loop unless a later non-live mode
  intentionally accepts multi-minute response times.

## Required Testing

- `POST /api/interview/sessions` returns a normalized runtime descriptor for
  both Realtime and chained lanes.
- The pre-start UI lets the learner choose `Realtime voice` or `Chained voice`.
- The bootstrap request carries `runtimePreference`, and the server either
  honors it or returns a safe validated fallback.
- Server routing falls back to `realtime_sts` when the browser capability
  report does not support committed-turn capture.
- `POST /api/interview/sessions/[sessionId]/turns` accepts committed audio,
  returns finalized transcript text plus assistant audio, and persists both
  turns.
- The premium and balanced chained profiles keep the same STT and TTS models
  and differ mainly in the selected text model and reasoning config unless a
  later story intentionally expands the comparison.
- Transcript persistence, session detail reads, debrief generation, and usage
  rollups continue to work for chained sessions.
- The shared immersive shell can run a chained session without a parallel page
  implementation.
- Frontend runtime adapter tests cover the chained live states:
  listening, recording, processing, and playing.
- Env validation tests cover new chained model and timing settings.

## Dependencies

- Reuses the persistence and debrief contract from `V2-US-03`.
- Reuses the session policy model from `V2-US-04`.
- Reuses the observability and runtime-versioning path from `V2-US-05`.
- Has now been explicitly reprioritized ahead of the remaining `V2-US-07`
  hardening work, so shared-contract alignment with Realtime is required but
  full `V2-US-07` completion is no longer the implementation gate.
- Should be designed alongside `V2-US-07` so both runtimes share one
  normalized runtime descriptor, routing model, and comparison model.
- Should stay compatible with `V2-US-10` and `V2-US-11`, which will later plug
  into the explicit text-generation step provided by this lane.

## Official References

- OpenAI voice agents guide:
  <https://developers.openai.com/api/docs/guides/voice-agents/>
- OpenAI speech-to-text guide:
  <https://developers.openai.com/api/docs/guides/speech-to-text/>
- OpenAI text-to-speech guide:
  <https://developers.openai.com/api/docs/guides/text-to-speech/>
- OpenAI models guide:
  <https://developers.openai.com/api/docs/models>
- OpenAI latest model guidance:
  <https://developers.openai.com/api/docs/guides/latest-model/>
- OpenAI changelog:
  <https://developers.openai.com/api/docs/changelog/>
- OpenAI audio transcription API reference:
  <https://api.openai.com/v1/audio/transcriptions>
- OpenAI audio speech API reference:
  <https://api.openai.com/v1/audio/speech>
- OpenAI responses API reference:
  <https://api.openai.com/v1/responses>
