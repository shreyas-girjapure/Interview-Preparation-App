# US-04B: Live Transcript and Session Controls

## Story

As a learner, I want visible transcript updates and focused session controls so
I can follow the conversation, inspect citations, and manage the interview
without losing context.

## Status

- `Status`: Partial
- `Shipped`: The transcript remains visible, assistant deltas and finalized
  turns are normalized into a stable order, and the control tray supports mute,
  cancel, end, reset, and retry flows across desktop and mobile layouts.
- `Pending`: Real search-backed recency answers with grounded citation rows
  still depend on the scoped recent-changes tool path from US-02.

## Acceptance Criteria

1. The transcript remains visible during the session and is never hidden behind
   an orb-only presentation.
2. The transcript shows finalized user turns, assistant transcript deltas, and
   finalized assistant turns in a stable reading order.
3. Search-backed recency answers show visible citations in the transcript area.
4. The control area supports mute or unmute, end session, and retry after
   failure.
5. Transcript and control surfaces match the approved mock treatment on desktop
   and mobile.
6. Completion and failure states render clearly in the transcript or control
   region without breaking the shell layout.

## Low-Level Solution Design

- Build production components for:
  `LiveTranscriptPanel` and `SessionControlBar`.
- Feed transcript and control state from the normalized app-facing contract
  produced by the US-03 adapter layer.
- Keep transcript rendering resilient to partial assistant deltas and finalized
  turn replacement without leaking SDK event names into the UI.
- Support auto-scroll that follows the active conversation while still allowing
  the user to inspect older messages.
- Render citation rows as structured metadata attached to assistant turns
  instead of ad hoc free-form blobs.
- Keep debrief persistence and post-session data loading out of this story; this
  story owns only the live transcript and control surface.

## Best Practices

- Keep transcript rendering readable under long answers, interruptions, and
  state transitions.
- Keep action labels short and consistent across ready, live, failed, and
  completed states.
- Avoid coupling transcript UI directly to database sequence IDs or persistence
  concerns.
- Reuse the approval baseline from US-04 and the shell structure from US-04A
  rather than introducing a separate visual system.

## Dependencies

- Depends on live session state from US-03.
- Depends on approved mocks from US-04.
- Depends on the implemented shell from US-04A.
- Blocks US-05 because it provides the stable transcript and control surface
  that persistence will extend.
