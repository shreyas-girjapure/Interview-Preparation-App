# AI Voice Agent Cost Optimization Epic

Status: Draft

This folder is a separate epic for reducing voice-interview runtime cost
without collapsing the product into a slower or lower-trust experience.

It is intentionally separate from `docs/ai-voice-agent-v2/` because some of
the work is operational, some is runtime policy, and some may change the
architecture from full speech-to-speech Realtime to a hybrid pipeline.

## Why This Exists

- The current app default is `gpt-realtime` in
  `src/lib/env.ts` and `.env.example`.
- The current bootstrap always requests audio output and full Realtime
  speech-to-speech sessions in `src/lib/ai/voice-agent.ts`.
- That is the highest-quality path, but it is not the cheapest path.
- We need a deliberate cost strategy before this feature scales to more users,
  longer sessions, playlist scope, and search-backed answers.

## Research Baseline

Research date: March 10, 2026

Verified from current official docs and pricing:

- OpenAI pricing currently lists `gpt-realtime` at:
  - text input: `$4.00 / 1M tokens`
  - cached text input: `$0.40 / 1M tokens`
  - text output: `$16.00 / 1M tokens`
  - audio input: `$32.00 / 1M tokens`
  - cached audio input: `$0.40 / 1M tokens`
  - audio output: `$64.00 / 1M tokens`
- OpenAI pricing currently lists `gpt-realtime-mini` at:
  - text input: `$0.60 / 1M tokens`
  - cached text input: `$0.06 / 1M tokens`
  - text output: `$2.40 / 1M tokens`
  - audio input: `$10.00 / 1M tokens`
  - cached audio input: `$0.30 / 1M tokens`
  - audio output: `$20.00 / 1M tokens`
- That means a default switch from `gpt-realtime` to
  `gpt-realtime-mini` reduces raw audio-token rates by about `69%` and raw
  text-token rates by about `85%`.
- OpenAI pricing currently lists `gpt-4o-mini-transcribe` at
  `$0.003 / minute`.
- OpenAI pricing currently lists `gpt-4o-mini-tts` at `$0.015 / minute`.
- OpenAI's Realtime cost guidance says:
  - Realtime caching works for audio, text, and images
  - any prefix change breaks cache reuse
  - a smaller token window is a direct cost-control lever
  - aggressive truncation can hurt cache hit rate
- OpenAI's Realtime session config allows:
  - `max_output_tokens`
  - `output_modalities: ["text"]` to disable audio
  - VAD tuning such as `silence_duration_ms`
  - `idle_timeout_ms` where supported by the turn-detection path
- Official LiveKit docs expose two first-class voice architectures:
  - STT -> LLM -> TTS pipelines
  - speech-to-speech realtime models

Inference from the sources:

- The lowest-risk savings are policy changes on the current stack:
  model tiering, shorter sessions, tighter output budgets, and better context
  discipline.
- The biggest architectural savings likely come from routing some interview
  flows away from full speech-to-speech Realtime and into a hybrid
  STT -> text model -> TTS path.

## Strategic Direction

### Phase A: Measure Before Cutting

- Add per-session unit economics first.
- We should know:
  - which model was used
  - how long the live session stayed open
  - how many turns happened
  - how much text and audio was generated
  - which session shapes are expensive and low value

### Phase B: Ship Low-Risk Savings First

- Default to `gpt-realtime-mini` unless policy explicitly upgrades the session.
- Cap dead air, cap session length, and cap verbose assistant turns.
- Stop carrying oversized scope snapshots and repeated prompt fragments.
- Preserve cache-friendly stable prompt prefixes.

### Phase C: Route By Experience, Not One Runtime

- Keep full `gpt-realtime` only where we need the best speech-to-speech feel.
- Use cheaper paths when the product goal is still met:
  - transcript-first or low-latency text mode
  - mini Realtime
  - hybrid STT -> text LLM -> TTS
- Server policy should own this routing. The browser should not choose the
  expensive path directly.

### Phase D: Add Spend Governors

- Add budget thresholds and kill switches.
- Degrade gracefully instead of surprising the team with runaway usage.
- Build a support path for "why did this session cost so much?"

## Goals

- Reduce average cost per completed session.
- Reduce cost variance across long and short sessions.
- Preserve a premium-quality path where it materially changes learner outcome.
- Make cost a visible runtime dimension, not a hidden bill later.

## Explicit Non-Goals

- Do not remove the voice feature.
- Do not store raw audio just to analyze cost.
- Do not switch architecture blindly without A/B evidence on latency and user
  quality.
- Do not put pricing or model choice under browser control.

## Story Order

1. [COST-US-01: Baseline usage and unit economics](./stories/COST-US-01-baseline-usage-and-unit-economics.md)
2. [COST-US-02: Default model tiering and session routing](./stories/COST-US-02-default-model-tiering-and-session-routing.md)
3. [COST-US-03: Session budgeting and idle controls](./stories/COST-US-03-session-budgeting-and-idle-controls.md)
4. [COST-US-04: Cache-friendly prompts and context discipline](./stories/COST-US-04-cache-friendly-prompts-and-context-discipline.md)
5. [COST-US-05: Hybrid voice pipeline experiment](./stories/COST-US-05-hybrid-voice-pipeline-experiment.md)
6. [COST-US-06: Budget guardrails and spend governors](./stories/COST-US-06-budget-guardrails-and-spend-governors.md)

## Recommended Rollout Order

- Ship `COST-US-01` first.
- After that, `COST-US-02` and `COST-US-03` are the fastest likely wins.
- `COST-US-04` should land before or alongside broader scale-up.
- `COST-US-05` is the largest possible saver, but it is an experiment, not an
  assumption.
- `COST-US-06` should be in place before wide rollout or paid acquisition.

## Decision Rules

- Any cost-saving change that is invisible to learners and low risk should be
  preferred over architectural churn.
- Any change that touches routing between `gpt-realtime`,
  `gpt-realtime-mini`, and hybrid voice paths must be server-owned.
- Any proposed quality downgrade must be validated against scoped interview
  outcomes, not just latency or cost.
- Use exact dates and exact pricing references when revisiting this document
  later because model pricing and feature support can change.

## Source Links

- OpenAI API pricing:
  <https://openai.com/api/pricing/>
- OpenAI Realtime API pricing model page:
  <https://platform.openai.com/docs/pricing?example=standard&api-mode=responses#gpt-realtime>
- OpenAI Realtime mini pricing model page:
  <https://platform.openai.com/docs/pricing?example=standard&api-mode=responses#gpt-realtime-mini>
- OpenAI pricing page entry for `gpt-4o-mini-transcribe`:
  <https://platform.openai.com/docs/pricing#gpt-4o-mini-transcribe>
- OpenAI pricing page entry for `gpt-4o-mini-tts`:
  <https://platform.openai.com/docs/pricing#gpt-4o-mini-tts>
- OpenAI Realtime create session reference:
  <https://developers.openai.com/api/reference/resources/realtime/subresources/sessions/methods/create/>
- OpenAI Realtime cost guide:
  <https://developers.openai.com/api/docs/guides/realtime-costs/>
- OpenAI Prompt Caching 201:
  <https://developers.openai.com/cookbook/examples/prompt_caching_201/>
- OpenAI Audio and speech guide:
  <https://developers.openai.com/api/docs/guides/audio/>
- OpenAI Text to speech guide:
  <https://developers.openai.com/api/docs/guides/text-to-speech/>
- OpenAI VAD guide:
  <https://developers.openai.com/api/docs/guides/realtime-vad/>
- LiveKit agents overview:
  <https://docs.livekit.io/agents/>
- LiveKit realtime models overview:
  <https://docs.livekit.io/agents/models/realtime/>
