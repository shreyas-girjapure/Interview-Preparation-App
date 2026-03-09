# US-06: Reliability, Security, and Testing

## Story

As the app owner, I need the voice interview feature to be safe, observable,
and release-ready before it becomes a normal part of the learner experience.

## Status

- `Status`: Partial
- `Shipped`: Session routes validate payloads with `zod`, cleanup runs across
  all client exit paths, and unit coverage exists for env parsing, prompt
  guardrails, bootstrap flow, and transcript normalization.
- `Pending`: Add persistence and PATCH route coverage, recent-changes policy
  tests, broader manual QA, one-live-session enforcement, and richer
  observability for production rollout.

## Acceptance Criteria

1. OpenAI API keys never reach the browser.
2. Runtime session creation, transcript writes, and completion writes all use
   validated payloads.
3. The feature releases the microphone and browser audio resources on every
   exit path.
4. Errors are surfaced with actionable user messages and distinct server-side
   status codes.
5. Lint, test, and build all pass after implementation.
6. Manual QA confirms guardrail behavior, interruption behavior, and mobile
   usability.

## Low-Level Solution Design

- Validate all interview API payloads with `zod`.
- Add light telemetry fields for session stage timings, disconnect reason,
  transcript flush success, and debrief generation status.
- Keep logs secret-safe: no API keys, no raw OpenAI headers, and no full prompt
  dumps in normal logs.
- Add a bounded upstream timeout to voice-session bootstrap calls.
- Gate session start behind authentication and keep one active live session per
  user as the default policy.
- Prefer explicit restart over hidden reconnect loops once a live session is
  already in progress.

## Required Test Coverage

- Unit tests for prompt builder guardrails and session payload defaults.
- Unit tests for interview API routes:
  auth failure, scope not found, env missing, OpenAI failure, success shape.
- Unit tests for the client adapter and SDK event normalization.
- Unit tests for recent-changes search policy:
  only fires for scoped recency intent, query is scope-bound, unrelated search
  asks are redirected, and citations are preserved.
- UI tests for:
  unauthenticated redirect or login gate, signed-in ready state,
  connecting state, active session, completed session, failed session.
- Persistence tests for transcript ordering, completion writes, and abandon
  writes.

## Manual QA Checklist

- Starting the interview requests mic access only after user action.
- The assistant opens by greeting the user and staying inside the target scope.
- Off-topic prompts are redirected back to the active topic or playlist.
- Asking for recent changes inside the active scope returns a grounded summary
  with visible citations.
- Asking for unrelated recent changes does not trigger open-ended search.
- The user can interrupt the assistant without the UI getting stuck.
- Transcript remains readable during voice playback.
- The page works on mobile without broken controls or hidden state.
- Ending or leaving the page releases the microphone cleanly.

## Best Practices

- Use the current Agents SDK voice-agent flow only; do not carry forward stale
  beta Realtime samples into the implementation.
- Keep runtime MCP out of V1 entirely.
- Keep the first release conservative: reliable SDK-managed browser voice,
  visible transcript, persisted text, and clean cleanup behavior before adding
  more advanced voice features.
- Keep the first visible rollout narrow: topic page CTA first, playlist and
  question entry points later.
- Keep recent-changes search narrow: active scope only, explicit recency intent
  only, and no general browsing mode.
- Keep scoring out of V1. Store the data needed for later evaluation, but do
  not block the first release on rubric engines or cross-session scorecards.

## Dependencies

- Applies to every prior story.
- Acts as the release gate for the implementation.
