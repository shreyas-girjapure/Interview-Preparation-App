# V2-US-09: Cross-Device Session Revocation and Takeover Recovery

## Story

As a learner, I want stale or duplicate live sessions to shut down and recover
cleanly across tabs, browsers, and devices so a refresh, takeover, or browser
crash does not leave me blocked behind an interview that no longer feels under
my control.

## Status

- `Status`: Draft
- `Why this exists`: `V2-US-04` made the local session ledger authoritative
  for one-live-session policy and server-owned `force-end`, but manual QA
  showed a remaining gap: the old browser client may keep talking until it
  hears about the revocation. Same-browser tabs can coordinate with
  `BroadcastChannel`, but different browsers and devices still depend on
  heartbeat timing or stale reclaim.
- `Current baseline`: the browser owns the OpenAI Realtime WebRTC connection,
  while the app server owns policy, ledger truth, and stale recovery. That is
  enough to block duplicate starts and audit forced ends, but it is not enough
  to guarantee an immediate upstream media kill from the server alone.
- `Implementation note`: this story should first harden recovery inside the
  current browser-owned transport model. It must also stay compatible with the
  longer-term dual-runtime plan where `realtime_sts` and `chained_voice` both
  exist. A true hard remote kill is a larger architecture decision and should
  stay an explicit second option, not a hidden requirement.

### Current Baseline After V2-US-04 Follow-Up

- Blocking-session conflicts already return structured `409
live_session_exists` responses.
- The active-session stale timeout has already been reduced from the original
  long window to a short bounded window intended for browser-owned sessions.
- The current client can already:
  - force-end a blocking session from the conflict UI
  - broadcast same-browser takeover events through `BroadcastChannel`
  - stop itself when heartbeat reveals that the server no longer considers the
    session active
- The remaining gap is cross-browser and cross-device propagation. If the old
  client is reachable but does not share a browser context, shutdown can still
  lag behind the takeover event.
- Once both runtimes exist, revocation semantics should stay shared even if the
  actual shutdown mechanics differ by runtime.

### Observed Failure Modes

- Refresh during an active session can leave the old session row in a blocking
  state if unload cancellation does not land.
- A takeover from another tab, browser, or device can update the server ledger
  correctly while the old client continues to speak briefly because it has not
  seen the revocation yet.
- The current blocked-start message is correct but incomplete unless the user
  also gets a fast recovery path and a clear explanation of what happened to
  the previous session.
- Because the browser owns the OpenAI transport, the server cannot promise a
  guaranteed hard stop for unreachable clients. It can only revoke local
  ownership, notify reachable clients, and reclaim stale rows.

## Acceptance Criteria

1. A user blocked by their own active session can explicitly take over without
   waiting for the stale timeout window.
2. When a session is force-ended, reclaimed, or otherwise revoked from another
   browser or device, any reachable old client detects that change and shuts
   down locally within a short bounded window, such as 5 to 10 seconds.
3. If the old client is unreachable, the user still has a bounded recovery path
   through stale reclaim and a clear message that the old client could not be
   contacted directly.
4. The old client shows a specific end state such as `ended elsewhere`,
   `reclaimed as stale`, or `policy ended`, instead of looking like a generic
   network failure.
5. Takeover and revocation events are auditable from persisted data. Support
   can tell which session or client initiated the takeover and why.
6. The product does not claim stronger control than it actually has. If the
   browser still owns media transport, UI and docs must not imply that the
   server can always hard-kill upstream audio immediately.
7. A refresh or browser close does not trap the user behind a stale session for
   longer than the defined short active-session recovery window.
8. The recovery design stays compatible with the current `POST /sessions`,
   `POST /force-end`, `POST /heartbeat`, persistence, and debrief flows.
9. If the app later routes some sessions to `chained_voice`, takeover and
   revocation semantics remain consistent even though that runtime can support
   stronger server-owned termination.

## Low-Level Solution Design

### Problem Boundary

- Separate `ledger truth` from `transport truth`.
- `Ledger truth` means the app server knows which session is allowed to own the
  interview.
- `Transport truth` means which browser still has an active OpenAI WebRTC
  connection, or which client still appears to own the runtime lane in use.
- `V2-US-04` solved ledger truth. This story is about reducing the gap between
  ledger truth and transport truth without rewriting the current runtime
  immediately.
- In the dual-runtime plan, the transport-control gap is widest on
  `realtime_sts` and narrower on server-owned chained voice. The product still
  needs one consistent takeover policy across both.

### Recommended Approach: Realtime Revocation Plus Fallback Reconciliation

This is the recommended first implementation because it fits the current
architecture, closes most of the real user pain, and still remains useful after
the second runtime ships.

#### Server-Owned Revocation Signal

- Treat updates to `interview_sessions` as the revocation source of truth.
- When a session transitions from `bootstrapping`, `ready`, or `active` into a
  terminal state, or when `forced_end_reason` becomes non-null, that change
  should be observable by the active client quickly.
- Use `Supabase Realtime` row subscriptions in the browser for the current
  `interview_sessions.id`.
- Subscribe only after the session id exists, and unsubscribe during local
  cleanup.
- On a matching row change:
  - if `state` is no longer blocking, begin local shutdown immediately
  - if `forced_end_reason` is present, render a takeover-specific status copy
  - if the row changed because the user ended locally, ignore the duplicate
    signal

Suggested client shutdown sequence:

1. mark the local attempt as revoked so later async callbacks cannot reopen it
2. best-effort persist already finalized transcript items with `keepalive`
3. send the local Realtime cancel or clear events that are currently available
4. close the transport
5. stop microphone tracks and detach audio
6. replace the stage with a bounded `session ended elsewhere` or
   `session reclaimed` state

#### Fallback Reconciliation Paths

- Keep the current heartbeat path, but shorten it from a long background pulse
  to a faster reconciliation window, such as 10 to 15 seconds.
- On `visibilitychange`, `focus`, and page restore events, perform a quick
  session-state read for the current session id.
- If the latest server state is terminal, shut down locally even if Realtime
  delivery was missed.
- Keep short stale windows as the last resort for unreachable old clients.

The rule should be:

- `Realtime subscription` is the first signal
- `focus or visibility readback` is the second signal
- `heartbeat` is the bounded background safety net
- `stale reclaim` is the final server-owned cleanup path

#### Takeover UX

- Keep the current blocked-start control in the same header action slot.
- Rename or clarify the action copy so it expresses the effect precisely, for
  example:
  - `End previous and start new`
  - `Take over session`
- When takeover succeeds:
  - immediately start the new interview
  - persist that the previous session was ended because of takeover
  - show a small inline note in the new session that the prior live interview
    was ended on another client
- When the old client receives revocation:
  - show a specific explanation
  - offer `View transcript` if transcript rows exist
  - offer `Start new interview` once policy allows it

#### Audit Metadata

The current `forced_end_reason` and `forced_end_at` fields are not enough to
debug every takeover. Add minimally sufficient metadata such as:

- `client_instance_id`
- `client_label` or coarse device description
- `replaced_session_id` on the new session when it takes over an old one
- `forced_end_by_client_instance_id` or equivalent actor metadata on the old
  session

This should remain lightweight. The goal is supportability, not device
fingerprinting.

#### Why This Approach Is Recommended

- It is incremental and compatible with the current browser-owned WebRTC model.
- It gives near-real-time cross-browser and cross-device revocation for
  reachable clients.
- It keeps the server as the policy authority without pretending the server
  owns media transport.
- It makes the current force-end path operationally useful instead of purely a
  ledger mutation.
- It remains useful even after the app supports both `realtime_sts` and
  `chained_voice`, because revocation policy and auditability should be shared.

#### Known Limitations

- If the old browser is offline, sleeping, frozen, or disconnected from
  Realtime delivery, it cannot be shut down instantly.
- This approach still cannot promise a true upstream hard kill because the
  browser, not the server, owns the OpenAI WebRTC session.
- Mobile browsers may pause timers and background delivery aggressively, so
  fallback reconciliation still matters even after Realtime subscription lands.

### Alternative Approach A: Polling-Only Recovery

This is the cheapest implementation if `Supabase Realtime` is considered too
heavy for now.

- Reduce heartbeat to 5 to 10 seconds.
- Add `GET /api/interview/sessions/[id]` checks on focus, visibility restore,
  reconnect, and startup.
- Stop the local client as soon as a non-blocking state is observed.

Pros:

- minimal new infrastructure
- simple to test
- works even if Realtime is not enabled in a target environment

Cons:

- slower than an event-driven subscription
- noisier on the backend
- still leaves visible lag across devices
- worse battery and network behavior on mobile

This is acceptable as a fallback layer, but it is weak as the main solution.

### Alternative Approach B: Server-Owned Runtime for True Remote Kill

If the product requirement becomes `the server must be able to terminate old
media immediately even when the client is not cooperating`, the architecture
must change.

Options include:

- a server-owned Realtime connection or proxy
- the chained `STT -> LLM -> TTS` runtime from `V2-US-08`

Under that model:

- the server owns the upstream OpenAI connection
- the browser becomes a thinner media client
- `force-end` can close the authoritative runtime directly

Pros:

- strongest remote control
- best auditability and observability
- easier to guarantee takeover semantics

Cons:

- significantly larger implementation and operational cost
- higher latency risk if not designed carefully
- overlaps with the runtime architecture work already scoped in `V2-US-08`

This should stay the explicit second-step option if the incremental approach
still leaves unacceptable product risk, or if the product decides that some
scopes or environments should prefer the chained lane for stronger control.

### Suggested Delivery Plan

#### Phase 1: Incremental Recovery Hardening

- add row-level `Supabase Realtime` revocation subscription
- shorten heartbeat interval for active sessions
- add focus and visibility reconciliation checks
- add minimal takeover audit metadata
- improve blocked and revoked session UX copy

This phase should close the main refresh, duplicate-browser, and cross-device
takeover pain while preserving the existing runtime.

#### Phase 2: Policy and Support Hardening

- add transcript-view recovery from revoked sessions
- surface clearer support metadata in the session detail response
- tune stale windows with real rollout data rather than fixed guesses

#### Phase 3: Escalate to Server-Owned Runtime Only If Needed

- pull forward `V2-US-08` or a dedicated proxy-runtime story if guaranteed hard
  remote termination becomes a release requirement

### Implementation Targets

- `supabase/migrations/<timestamp>_interview_session_takeover_recovery.sql`
- `src/lib/interview/voice-interview-sessions.ts`
- `src/lib/interview/voice-interview-api.ts`
- `src/lib/supabase/client.ts`
- `src/hooks/use-voice-interview-agent.ts`
- `src/components/voice-interview/voice-stage.tsx`
- `src/app/api/interview/sessions/[sessionId]/route.ts`
- `src/app/api/interview/sessions/[sessionId]/force-end/route.ts`

## Best Practices

- Be precise about what is being revoked: local session ownership, not
  guaranteed upstream media in every case.
- Prefer fast event-driven shutdown for reachable clients, with heartbeat and
  stale reclaim as layered fallbacks.
- Keep takeover UX explicit. Do not silently steal session ownership without
  telling the user what happened.
- Persist just enough actor metadata to debug takeovers later.
- Treat cross-device recovery as an operational reliability feature, not only a
  convenience feature.

## Required Testing

- Same-browser tab takeover shuts down the old tab immediately and does not
  leave both tabs appearing active.
- Cross-browser or second-profile takeover shuts down the old reachable client
  within the bounded target window.
- Refresh during an active session no longer traps the user behind a blocking
  row for the full stale window when recovery signals are available.
- Offline or sleeping old clients fall back to stale reclaim cleanly without
  corrupting transcript persistence.
- Revoked sessions preserve already finalized transcript items and show a clear
  terminal reason.
- Audit fields correctly identify takeover source and target sessions or
  clients.
- The system never allows two authoritative blocking session rows for one user.

## Dependencies

- Builds on the session-policy and `force-end` model from `V2-US-04`.
- Builds on transcript persistence from `V2-US-03`.
- Benefits from the tracing and debug-correlation work in `V2-US-05`.
- May be partially superseded by `V2-US-08` if the product later chooses a
  server-owned voice runtime for hard remote control.
