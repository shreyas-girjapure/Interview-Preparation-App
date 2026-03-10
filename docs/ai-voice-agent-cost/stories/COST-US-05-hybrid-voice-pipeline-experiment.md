# COST-US-05: Hybrid Voice Pipeline Experiment

## Story

As the app owner, I need to evaluate a hybrid
STT -> text model -> TTS voice path so we can decide whether all scoped
interviews really need full speech-to-speech Realtime.

## Status

- `Status`: Draft
- `Why this exists`: official platform docs and agent frameworks support both
  speech-to-speech realtime models and classic STT/LLM/TTS pipelines. The
  cheaper path may be good enough for some session types.

## Acceptance Criteria

1. The app can run a controlled experiment comparing:
   `gpt-realtime-mini` vs hybrid STT -> text model -> TTS.
2. The experiment measures:
   cost, latency, interruption feel, transcript quality, and learner-perceived
   quality.
3. The UI shell remains the same even if the transport architecture changes.
4. The team can make a go or no-go decision for specific session classes such
   as topic interviews, playlist interviews, or transcript-first modes.

## Low-Level Direction

- Candidate hybrid stack:
  - `gpt-4o-mini-transcribe` for speech-to-text
  - a cheaper text model for interviewer reasoning
  - `gpt-4o-mini-tts` for audio output
- Keep the browser contract thin by hiding routing behind the same session
  bootstrap API.
- Reuse the transcript, persistence, and observability layers from the current
  Realtime path so comparisons are fair.

## Best Practices

- Treat this as an experiment, not a foregone conclusion.
- Compare quality by scoped interview outcome, not just by mean latency.
- Keep a clean rollback path to full Realtime.

## Dependencies

- Should follow `COST-US-01` and be informed by `COST-US-02`.
