# US-05: Transcript Persistence and Debrief

## Story

As a user, I want my interview transcript, session outcome, and written debrief
saved so that the session remains useful after the live voice conversation ends.

## Status

- `Status`: Complete for V1 baseline
- `Shipped`: Starting a session creates a local DB row immediately, and the
  live client patches session state through `ready`, `active`, `completed`,
  `failed`, and `cancelled`, which gives V1 a reliable baseline session ledger.
- `Moved to V2`: Finalized transcript turn writes, `interview_messages`,
  abandon or unload flush, completion metrics, and server-generated debrief
  content now belong to the V2 epic.

Historical note: the acceptance criteria below capture the original broader
story intent. The unfinished stretch items were intentionally moved to V2 when
V1 was closed on 2026-03-10.

## Acceptance Criteria

1. Starting a session creates a local DB record immediately.
2. Finalized transcript turns are persisted during the session, not only at the
   very end.
3. Completing a session stores session metrics and a structured written
   debrief.
4. Abandoned or failed sessions are marked accurately.
5. Raw audio is not stored in V1.
6. Transcript order is deterministic and stable across reload or partial retry
   scenarios.

## Low-Level Solution Design

- Add a new migration such as
  `supabase/migrations/<timestamp>_interview_voice_sessions.sql`.
- Add `interview_sessions` with:
  `id`, `user_id`, `scope_type`, `scope_ref_id`, `scope_slug`, `scope_title`,
  `scope_snapshot_json`, `status`, `mode`, `openai_session_id`, `model`,
  `voice`, `started_at`, `ended_at`, `duration_seconds`, `metrics_json`,
  `debrief_json`, `created_at`, `updated_at`.
- Add `interview_messages` with:
  `id`, `session_id`, `sequence`, `role`, `source`, `content_text`, `item_id`,
  `event_type`, `started_at`, `created_at`, `metadata_json`.
- Add indexes on `(user_id, created_at desc)` for sessions and
  `(session_id, sequence)` for transcript items.
- Add owner-based RLS following current repo conventions.
- Add `POST /api/interview/sessions/[id]/events` for batched finalized turns.
- Add `POST /api/interview/sessions/[id]/complete` for final flush,
  metrics write, and written debrief generation.
- Add `POST /api/interview/sessions/[id]/abandon` for early exits or setup
  failures.
- Generate the written debrief server-side with structured JSON sections:
  `summary`, `strengths`, `gaps`, `follow_up_topics`,
  `recommended_next_step`, `confidence_notes`.
- Record whether out-of-scope redirects occurred during the session in
  `metrics_json` so QA can spot drift.
- Record recent-changes search usage and cited sources in `metadata_json` so
  later review can distinguish grounded recency answers from normal coaching.
- Do not add a formal scoring pipeline in V1. Persist the data needed for later
  scoring, but keep V1 outputs limited to transcript, metrics, and debrief.

## Transcript Mapping Rules

- Finalize user turns from SDK-provided finalized transcription updates rather
  than optimistic local UI guesses.
- Stream assistant text from SDK transcript delta updates or their current
  equivalent session callbacks.
- Finalize assistant turns on the SDK's assistant-turn completion signal.
- Keep transcript mapping inside a small adapter helper so persistence code does
  not depend directly on SDK event names.
- Persist finalized turns only. Do not persist partial deltas.
- Flush transcript turns after each finalized turn or on a short debounce.
- Use `navigator.sendBeacon` for a best-effort final flush on unload.
- Persist citation metadata for search-backed assistant turns.

## Best Practices

- Do not wait until the session ends to persist everything.
- Keep sequence numbering client-owned and monotonic within a session.
- Keep debrief generation server-side so transcripts and rubric context stay
  out of the browser.
- Store no raw audio blobs, PCM chunks, or browser recordings.
- Preserve the scope snapshot used to create the session so later QA can
  explain why the agent responded the way it did.
- Treat transcript storage as foundation work for later scoring, not as a
  reason to expand V1 into a full evaluation system.
- Attach debrief and persisted-session rendering to the modular shell and
  transcript surfaces from US-04A and US-04B rather than rebuilding the page.

## Dependencies

- Depends on live event handling from US-03.
- Depends on stable transcript and control state from US-04B.
