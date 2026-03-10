# COST-US-02: Default Model Tiering and Session Routing

## Story

As the app owner, I need the server to choose the cheapest acceptable voice
runtime for each interview session so premium spend is reserved for cases that
need it.

## Status

- `Status`: Draft
- `Why this exists`: the current baseline defaults to `gpt-realtime` for every
  live session, even though `gpt-realtime-mini` is much cheaper.

## Acceptance Criteria

1. The default live route uses `gpt-realtime-mini` unless an explicit upgrade
   policy selects `gpt-realtime`.
2. Model routing remains server-owned and is never accepted from the browser.
3. The routing policy can consider at least:
   scope type, feature flags, account tier, and explicit internal allowlists.
4. The chosen model is persisted on the session row and visible in telemetry.
5. The rollout includes a safe way to compare quality, latency, and cost
   between `gpt-realtime` and `gpt-realtime-mini`.

## Low-Level Direction

- Introduce a small routing policy module such as
  `voice-interview-runtime-policy.ts`.
- Separate:
  - default model
  - premium override model
  - fallback model
- Keep the initial routing policy simple:
  - topic interviews -> `gpt-realtime-mini`
  - premium or allowlisted sessions -> `gpt-realtime`
  - bootstraps that exceed cost or quota policy -> deny or degrade cleanly

## Best Practices

- Start with opt-up to premium, not opt-down from premium.
- Persist the decision reason, not just the chosen model.
- Do not conflate quality experiments with permanent routing policy.

## Dependencies

- Should follow `COST-US-01`.
