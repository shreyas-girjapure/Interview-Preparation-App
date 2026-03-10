# COST-US-01: Baseline Usage and Unit Economics

## Story

As the app owner, I need per-session cost visibility so we can reduce spend
based on evidence instead of intuition.

## Status

- `Status`: Draft
- `Why this exists`: today we can trace technical behavior, but we still cannot
  answer basic spend questions such as which model, scope, or session shape is
  actually expensive.

## Acceptance Criteria

1. Every completed, cancelled, and failed session records the model,
   transcription model, scope type, scope slug, session duration, turn count,
   and an estimated cost breakdown.
2. The cost breakdown separates:
   Realtime model spend, transcription spend, search spend if any, and debrief
   spend if any.
3. Operators can compare cost by:
   topic vs playlist scope, model tier, success vs failure, and session length.
4. The app can identify outlier sessions and the top drivers of average spend.

## Low-Level Direction

- Extend `interview_sessions` with unit-economics fields such as:
  `runtime_model`, `transcription_model`, `session_duration_seconds`,
  `assistant_turn_count`, `user_turn_count`, `estimated_realtime_cost_usd`,
  `estimated_transcription_cost_usd`, `estimated_total_cost_usd`,
  and `cost_version`.
- Add a small server-owned pricing table module so estimates are versioned and
  reproducible.
- Use telemetry from the current live session flow plus any usage fields made
  available by OpenAI events to estimate spend.
- Treat the first version as an internal estimate engine. Precision can improve
  later, but the system must be directionally useful immediately.

## Best Practices

- Version the estimator so historical sessions remain interpretable after
  pricing changes.
- Prefer durable per-session summaries over high-volume raw event storage.
- Keep pricing data server-owned and dated.

## Dependencies

- Builds on the observability work in `V2-US-05`.
