# V2-US-04: Live-Session Policy and Server-Side Controls

## Story

As the app owner, I need each user limited to one active live session and I
need server-owned runtime controls so the browser cannot silently diverge from
app policy.

## Status

- `Status`: Done
- `Why this exists`: V1 tracks lifecycle state, but it does not yet enforce a
  single active session policy or provide a stronger server-owned control path
  for runtime changes and shutdown.
- `Current baseline`: bootstrap creates local session rows and the browser
  patches lifecycle state, but no server-side guard stops duplicate live
  sessions today.
- `Implementation note`: this story should stay compatible with the current
  browser-bootstrap model. It does not require moving media transport into a
  server proxy.
- `Closure note`: one-live-session enforcement, stale reclaim, server-owned
  `force-end`, heartbeat, duplicate-session recovery, and same-browser takeover
  coordination are in place. The remaining cross-browser and cross-device
  revocation gap is now intentionally tracked as `V2-US-09`, not as unfinished
  core scope inside this story.

### Implemented now (2026-03-10)

- Added migration `20260310020000_interview_session_policy.sql` with:
  runtime version fields, stale and heartbeat tracking, forced-end fields,
  blocking-session indexes, and a partial unique index that enforces one
  blocking live session per user.
- Added server policy/runtime constants and stale window logic in
  `voice-interview-sessions.ts`.
- Added server-owned blocking guard + stale reclaim flow via
  `getBlockingInterviewSessionForUser`, including stale auto-cancellation.
- Added structured conflict path for bootstrap:
  `409 live_session_exists` with blocking session metadata.
- Added bounded server-owned control helpers and routes:
  `POST /api/interview/sessions/[id]/force-end`
  `POST /api/interview/sessions/[id]/heartbeat`
- Persisted runtime version metadata on session create and ready transitions.
- Added client handling for duplicate-session conflicts and active heartbeat
  pings while live.
- Added route/service tests for conflict detection, stale reclaim, force-end,
  and heartbeat behavior.

### Done Notes

- Production caller policy for `force-end` still needs confirmation during
  rollout, but the implementation scope of this story is complete.
- Cross-browser and cross-device revocation latency is not considered a blocker
  for closing this story because that work now belongs to `V2-US-09`.

## Acceptance Criteria

1. A user cannot bootstrap a second live session while another session is still
   `bootstrapping`, `ready`, or `active` unless the older session is stale or
   explicitly cancelled.
2. Duplicate bootstrap attempts return a clear API error and enough metadata to
   identify the blocking session.
3. Session runtime metadata is versioned and persisted:
   prompt version, search-policy version, transcript-persistence version,
   transport version, model, and voice.
4. Stale sessions are recoverable through explicit server-owned expiry rules for
   `bootstrapping`, `ready`, and `active`.
5. The server can mark a session cancelled or forced-ended without trusting the
   browser alone, even if the browser is gone or unresponsive.
6. The browser receives a bounded and understandable response when a duplicate
   session or forced-end rule blocks progress.
7. Policy enforcement is auditable from persisted session data.

## Low-Level Solution Design

### Data Model

- Extend `interview_sessions` with fields that make policy enforcement
  explicit and queryable:
  `runtime_prompt_version`, `runtime_search_policy_version`,
  `runtime_persistence_version`, `runtime_transport_version`,
  `forced_end_reason`, `forced_end_at`, `stale_at`,
  and `last_client_heartbeat_at`.
- Keep model and voice in the already existing columns
  `openai_model` and `openai_voice`.
- Treat `bootstrapping`, `ready`, and `active` as the only blocking states for
  the one-live-session policy.
- Add an index that helps find blocking sessions quickly, such as
  `(user_id, state, created_at desc)`.

### Active Session Guard

- Add a server helper such as `getBlockingInterviewSessionForUser(userId)`.
- Call it inside `POST /api/interview/sessions` before
  `createInterviewSessionRecord`.
- The guard should:
  1. find the newest session in a blocking state for the current user
  2. evaluate whether it is stale
  3. if not stale, reject the new bootstrap with a structured conflict error
  4. if stale, reclaim it by marking it `cancelled` with a forced-end reason
     before allowing the new bootstrap
- Use a DB-backed path rather than a browser-only check. The browser can race;
  the server should be authoritative.
- If needed, wrap the guard plus insert in a single RPC or transactional path so
  two simultaneous bootstrap attempts cannot both win.

Suggested error shape:

```ts
type CreateVoiceInterviewSessionConflictResponse = {
  error: string;
  errorCode: "live_session_exists";
  blockingSession: {
    id: string;
    state: "bootstrapping" | "ready" | "active";
    scopeSlug: string;
    scopeTitle: string;
    scopeType: "topic" | "playlist" | "question";
    startedAt: string | null;
    staleAt: string | null;
  };
};
```

### Stale Session Policy

- Define explicit stale thresholds in server code or env:
  `bootstrapping`: short threshold, for example 2 minutes
  `ready`: medium threshold, for example 10 minutes
  `active`: longer threshold, for example 20 to 30 minutes without heartbeat
- `bootstrapping` is stale when the session never reached ready in time.
- `ready` is stale when the browser never moved it to active and the client
  secret window is effectively no longer usable.
- `active` is stale when no heartbeat or terminal event has been seen within the
  policy window.
- When reclaiming a stale session, mark it `cancelled`, store
  `forced_end_reason`, and set `forced_end_at`.

### Runtime Versioning

- Define server-owned constants for:
  `VOICE_INTERVIEW_PROMPT_VERSION`
  `VOICE_INTERVIEW_SEARCH_POLICY_VERSION`
  `VOICE_INTERVIEW_PERSISTENCE_VERSION`
  `VOICE_INTERVIEW_TRANSPORT_VERSION`
- Persist these at session create or ready-state update time.
- The browser should never provide or override version identifiers.
- Keep the first versioning scheme simple strings such as:
  `voice-prompt-v2-2026-03-10`
  `docs-search-v1`
  `transcript-persistence-v1`
  `agents-webrtc-v1`

### Server-Owned Control Surface

- Add a bounded control endpoint such as:
  `POST /api/interview/sessions/[id]/force-end`
- Support explicit reasons such as:
  `duplicate_session`, `stale_session`, `policy_update`, `admin_shutdown`
- This endpoint updates the local session ledger even if the browser never calls
  back.
- With the current browser WebRTC bootstrap, local server control is mostly
  about policy and ledger truth, not guaranteed upstream media termination.
- If the current OpenAI/Agents path exposes a usable server-side control handle
  later, it can be wired behind the same server-owned interface without
  redesigning the feature.
- Do not over-promise a full remote media kill if the present browser flow does
  not expose the necessary upstream control handle.

### Browser Coordination

- Update the client bootstrap flow to recognize `409 live_session_exists`.
- When a blocking session exists:
  - show a bounded UI message
  - optionally offer "resume existing session" later if a resume flow is added
  - otherwise instruct the user to end or wait for the existing session
- Add a lightweight heartbeat while a session is `active`, for example a small
  `POST /api/interview/sessions/[id]/heartbeat` every 30 to 60 seconds.
- Heartbeat updates only `last_client_heartbeat_at`; it does not replace the
  richer transcript persistence work from `V2-US-03`.
- Terminal endpoints from `V2-US-03` should clear the blocking condition
  immediately.

### Implementation Targets

- `supabase/migrations/<timestamp>_interview_session_policy.sql`
- `src/lib/interview/voice-interview-sessions.ts`
- `src/lib/interview/voice-interview-api.ts`
- `src/app/api/interview/sessions/route.ts`
- `src/app/api/interview/sessions/[sessionId]/force-end/route.ts`
- `src/app/api/interview/sessions/[sessionId]/heartbeat/route.ts`
- `src/hooks/use-voice-interview-agent.ts`

## Best Practices

- One active session per user should be the default, not an optional cleanup
  preference.
- Persist runtime versions before a failure happens so regressions can be tied
  back to a concrete shipped configuration.
- Keep force-end behavior explicit and auditable.
- Prefer server-owned policy over optimistic browser behavior.
- Be precise about current control limits: enforce local app policy now, and
  only add upstream session mutation when the transport exposes a safe handle.

## Required Testing

- Second bootstrap attempts are rejected while a blocking session is active.
- Near-simultaneous bootstrap races do not create two active sessions for one
  user.
- Stale `bootstrapping`, `ready`, and `active` sessions can be reclaimed under
  the defined policy windows.
- Forced server-side cancellation transitions the session to the correct final
  state and records `forced_end_reason`.
- Heartbeat updates prevent active sessions from being reclaimed prematurely.
- Runtime version fields are stored for every successful session bootstrap.

## Dependencies

- Depends on the shipped V1 lifecycle state model.
- Should build on the explicit terminal endpoints from `V2-US-03`.
- Should land before broad rollout of playlist scope.
