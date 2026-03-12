# V2-US-03: Transcript Persistence and Server Debriefs

## Story

As a learner, I want the finalized interview transcript and written debrief to
persist after the live session so the conversation remains useful after the
browser session ends.

## Status

- `Status`: Done
- `Shipped`: Finalized transcript turn writes, debrief generation, and `interview_messages` persistence are all fully implemented via `voice-interview-persistence.ts` and `voice-interview-debrief.ts` as of 2026-03-10.
- `Why this exists`: V1 had reliable session lifecycle rows but not durable finalized-turn persistence or server-generated debrief content. This story extended the baseline.

### Implemented now (2026-03-10)

- Added migration `20260310010000_interview_voice_persistence.sql` to:
  extend `interview_sessions` with persistence and debrief fields, add
  `interview_messages`, enforce `(session_id,item_id)` uniqueness, add ordering
  index, and apply owner-based RLS policies.
- Added persistence/debrief server modules:
  `voice-interview-persistence.ts` and `voice-interview-debrief.ts`.
- Extended session service layer with:
  `persistInterviewSessionEvents`, `completeInterviewSession`,
  `cancelInterviewSession`, and `getInterviewSessionDetail`.
- Added API contracts and routes for:
  `POST /events`, `POST /complete`, `POST /cancel`, and `GET /[sessionId]`.
- Wired client flush flow in `use-voice-interview-agent.ts`:
  debounced snapshot upserts for finalized items, terminal complete/cancel
  calls, and best-effort unload flush (`sendBeacon` + keepalive fallback).
- Added unit coverage for persistence/debrief helpers and route-level validation
  and auth/session error handling for `events`, `complete`, and `cancel`.
- Added idempotency and ordering-focused tests for:
  snapshot re-flush re-position updates, duplicate complete handling on already
  completed sessions, duplicate cancel handling on terminal sessions, and
  session detail route read/update behavior.

### Done Notes

- Best-effort unload persistence remains inherently browser-dependent, but the
  persistence contract itself is now closed.
- Any follow-up tied to session takeover, stale blocking rows, or remote client
  shutdown is tracked outside this story.

## Acceptance Criteria

1. Finalized transcript items are persisted during the session instead of only
   at the very end.
2. Persisted order stays deterministic even when `previousItemId` arrives late
   or a finalized item must be re-positioned before the next flush.
3. The persistence path is idempotent. Duplicate flushes and reconnect retries
   do not create duplicate transcript rows.
4. Completion writes persist minimal session metrics and a structured
   server-generated debrief.
5. Failed and cancelled sessions preserve already finalized transcript items but
   do not get marked as completed.
6. Best-effort unload or page-leave flush exists for already finalized items.
7. Raw audio is never stored.
8. Search-backed assistant turns preserve citation metadata in persistence.
9. A persisted session can be read back after the browser session ends through
   a server helper or API read contract.
10. If debrief generation fails, the session still completes cleanly and the
    transcript remains available with a bounded debrief fallback state.

## Low-Level Solution Design

### Data Model

- Add a new migration for durable transcript rows, for example:
  `supabase/migrations/<timestamp>_interview_voice_persistence.sql`.
- Extend `interview_sessions` with fields such as:
  `metrics_json`, `debrief_json`, `debrief_status`, `debrief_error_code`,
  `debrief_generated_at`, `completion_reason`, `persisted_turn_count`,
  and `last_client_flush_at`.
- Add `interview_messages` with a V2-focused shape:
  `id`, `session_id`, `item_id`, `previous_item_id`, `client_sequence`,
  `speaker`, `source`, `label`, `meta_label`, `tone`, `content_text`,
  `citations_json`, `finalized_at`, `created_at`, and `updated_at`.
- Use `jsonb` for `metrics_json`, `debrief_json`, and `citations_json`.
- Add a unique constraint on `(session_id, item_id)` so snapshot re-flushes
  update existing rows instead of duplicating them.
- Add an ordering index on `(session_id, client_sequence)`.
- Apply owner-based RLS consistent with the current `interview_sessions` table.

### Write API

- Keep the existing `PATCH /api/interview/sessions/[id]` route for lightweight
  lifecycle updates such as `active` and early bootstrap `failed`.
- Add `POST /api/interview/sessions/[id]/events` for transcript persistence.
- Add `POST /api/interview/sessions/[id]/complete` for final flush, metric
  persistence, debrief generation, and the `completed` terminal transition.
- Add `POST /api/interview/sessions/[id]/cancel` for user exit, page unload,
  retry reset, or setup-abort cancellation with an optional final flush.
- Prefer explicit terminal endpoints over `PATCH state=completed|cancelled`
  because terminal flows now carry transcript and debrief work.

Suggested request shapes:

```ts
type PersistedTranscriptItemPayload = {
  itemId: string;
  previousItemId?: string | null;
  clientSequence: number;
  speaker: "assistant" | "user" | "system";
  source: "realtime" | "system" | "search";
  label: string;
  metaLabel: string;
  text: string;
  tone?: "default" | "search" | "status" | "error";
  citations?: Array<{
    title?: string;
    label?: string;
    url: string;
    source: string;
    publishedAt?: string | null;
    snippet?: string | null;
    confidence?: number | null;
  }>;
  finalizedAt: string;
};

type PersistInterviewEventsRequest = {
  finalizedItems: PersistedTranscriptItemPayload[];
};

type CompleteInterviewSessionRequest = {
  finalizedItems: PersistedTranscriptItemPayload[];
  metrics: {
    elapsedSeconds: number;
    finalizedTurnCount: number;
    assistantTurnCount: number;
    userTurnCount: number;
    persistedMessageCount: number;
    searchTurnCount: number;
    completionReason: "user_end" | "disconnect" | "error_recovery";
  };
};

type CancelInterviewSessionRequest = {
  reason: "user_exit" | "page_unload" | "retry" | "setup_abort";
  finalizedItems?: PersistedTranscriptItemPayload[];
};
```

- `POST /events` should upsert transcript rows by `(session_id, item_id)` and
  update `client_sequence`, `previous_item_id`, text, tone, and citations when
  the same finalized item is re-sent.
- `POST /complete` should:
  1. persist the last finalized snapshot
  2. write final metrics
  3. generate the debrief from stored transcript plus scope snapshot
  4. transition the session to `completed`
  5. return the stored debrief payload
- `POST /cancel` should persist any provided finalized items, set
  `completion_reason`, and transition the session to `cancelled` unless the row
  is already terminal.

### Client Flush Model

- Reuse the current transcript assembly in
  `src/hooks/use-voice-interview-agent.ts`.
- Build a derived `persistableFinalizedItems` list from
  `[...statusItems, ...conversationItems]`.
- Persist only items that are both:
  finalized and explicitly worth keeping after reload.
- User and assistant turns are persistable by default once finalized.
- System items should persist only when explicitly flagged as durable, such as:
  search fallback notes, search citation notes, terminal failure notes, or
  transcription failure notices. Transient bootstrap status copy should stay
  client-only.
- Use short debounced snapshot flushes after finalized-item changes rather than
  fragile append-only deltas. Session sizes are small enough for snapshot-style
  upserts to be acceptable and much easier to reconcile.
- Use `fetch(..., { keepalive: true })` and `navigator.sendBeacon` for
  best-effort final flush on unload.
- Streaming assistant deltas and partial user transcription text remain local
  UI state only.

### Transcript Mapping Rules

- Keep the current SDK-to-transcript mapping in
  `src/lib/interview/voice-interview-runtime.ts` as the single translation
  layer.
- Finalize user transcript items from
  `conversation.item.input_audio_transcription.completed`.
- Finalize assistant transcript items only when the Realtime item is no longer
  `in_progress`.
- If a finalized item is re-positioned later because `previousItemId` arrives
  after the first insert, the next debounced snapshot flush must resend that
  item's updated `clientSequence`.
- Persist the normalized citation payload produced by the search path rather
  than a raw provider-specific search result blob.

### Debrief Generation

- Add a server module such as `src/lib/interview/voice-interview-debrief.ts`.
- Generate the debrief only from stored transcript rows, the stored
  `scope_snapshot`, minimal session metrics, and grounded citation metadata.
- Do not accept a browser-authored final summary as the source of truth.
- Keep the first debrief contract aligned with the current completion UI shape
  so it is easy to render without redesigning the page:

```ts
type PersistedVoiceInterviewDebrief = {
  summary: string;
  strengths: string;
  sharpen: string;
  nextDrill: string;
  confidenceNotes?: string;
};
```

- Store the debrief as structured JSON in `debrief_json`.
- Track `debrief_status` as something like `pending`, `ready`, or `failed`.
- If debrief generation fails, persist `debrief_status = failed`,
  `debrief_error_code`, and keep the transcript plus session completion intact.

### Read Path and UI Integration

- Add a server read helper such as `getInterviewSessionDetail(sessionId)` that
  returns the session row, ordered persisted transcript items, and debrief.
- Add `GET /api/interview/sessions/[id]` or an equivalent server-only loader so
  persisted sessions can be rehydrated after reload.
- The live route can keep rendering in-memory transcript state during the active
  session, but completion and revisit flows should be able to hydrate from the
  persisted source of truth.
- A full session-history list UI is deferred. This story only needs the single
  session read contract.

### Implementation Targets

- `supabase/migrations/<timestamp>_interview_voice_persistence.sql`
- `src/lib/interview/voice-interview-sessions.ts`
- `src/lib/interview/voice-interview-api.ts`
- `src/lib/interview/voice-interview-runtime.ts`
- `src/lib/interview/voice-interview-debrief.ts`
- `src/lib/interview/voice-interview-persistence.ts`
- `src/app/api/interview/sessions/[sessionId]/events/route.ts`
- `src/app/api/interview/sessions/[sessionId]/complete/route.ts`
- `src/app/api/interview/sessions/[sessionId]/cancel/route.ts`
- `src/app/api/interview/sessions/[sessionId]/route.ts`
- `src/hooks/use-voice-interview-agent.ts`

## Best Practices

- Do not trust the browser as the source of truth for the final debrief.
- Keep transcript mapping isolated from raw SDK event names.
- Prefer snapshot-style upserts over fragile append-only diffs while session
  sizes remain small.
- Store enough metadata to debug ordering bugs and replay issues later.
- Keep debrief generation deterministic enough that prompt-version regressions
  can be spotted.
- Treat persisted search citations as evidence metadata, not as future prompt
  instructions.

## Required Testing

- `use-voice-interview-agent` only flushes finalized persistable items and never
  flushes streaming text.
- Finalized transcript ordering is stable even when previous-item metadata
  arrives late.
- Snapshot re-flushes and duplicate terminal requests remain idempotent.
- `POST /complete` stores transcript, metrics, and debrief, then marks the
  session completed.
- `POST /cancel` stores available transcript but does not mark the session
  completed.
- Debrief generation returns the expected JSON contract and handles sparse
  transcripts gracefully.
- Search-backed turns persist citation metadata in the stored rows.
- A persisted session can be loaded back in the correct order after reload.

## Dependencies

- Depends on the shipped V1 transcript adapter and UI baseline.
- Should accept grounded citation payloads from `V2-US-01` and the safety rules
  from `V2-US-02`.
- Should align with richer runtime metadata and telemetry added later in
  `V2-US-04` and `V2-US-05`.
