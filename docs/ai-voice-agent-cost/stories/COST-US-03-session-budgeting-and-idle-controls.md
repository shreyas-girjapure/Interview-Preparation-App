# COST-US-03: Session Budgeting and Idle Controls

## Story

As the app owner, I need hard limits on dead air, overly long sessions, and
overly verbose model turns so the live voice runtime does not keep burning
money when the learner is no longer getting value.

## Status

- `Status`: Draft
- `Why this exists`: cost is not only model selection; it is also how long we
  keep a premium realtime session open and how much audio or text we generate.

## Acceptance Criteria

1. Live sessions have a configurable max duration and a configurable idle
   reclaim policy.
2. Assistant turns have an explicit output budget that is smaller than the
   current unconstrained model maximum.
3. Empty or abandoned sessions are ended automatically and safely.
4. The learner gets clear UX when a session ends due to time or inactivity.
5. The team can measure how much spend is prevented by these controls.

## Low-Level Direction

- Revisit the current:
  - `max_output_tokens`
  - VAD thresholds
  - `silence_duration_ms`
  - server-side stale session reclaim from `V2-US-04`
- Evaluate `idle_timeout_ms` support in the chosen Realtime path and use it
  where compatible.
- Add server-owned policies for:
  - max live minutes per session
  - max silent seconds before reclaim
  - max retries per launch
  - max assistant follow-up length

## Best Practices

- End a dead session faster than you end an active thoughtful pause.
- Keep the session shell readable when budget controls trigger.
- Measure prevented spend, not just triggered limits.

## Dependencies

- Builds on `V2-US-04` and should follow `COST-US-01`.
