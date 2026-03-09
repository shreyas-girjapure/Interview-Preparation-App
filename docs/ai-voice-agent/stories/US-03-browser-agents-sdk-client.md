# US-03: Browser Agents SDK Client

## Story

As a signed-in user, I want the browser to connect to the interview through the official
OpenAI Agents SDK so the spoken interview feels natural without us hand-rolling
the low-level Realtime transport.

## Acceptance Criteria

1. The browser requests microphone access only after an explicit user action.
2. The client creates the browser voice session through the current OpenAI
   Agents SDK voice-agent flow.
3. The browser uses WebRTC transport through the SDK rather than manual peer
   connection wiring in application code.
4. Remote model audio plays in the page once the session is established.
5. The interviewer opens the conversation automatically once the SDK session is
   ready.
6. SDK session, microphone, and browser audio resources are always cleaned up
   on completion, failure, or route exit.

## Low-Level Solution Design

- Create a dedicated hook such as `src/hooks/use-voice-interview-agent.ts`.
- Acquire audio with `echoCancellation`, `noiseSuppression`, and
  `autoGainControl`.
- Use the official OpenAI Agents SDK for TypeScript and the current voice-agent
  quickstart patterns at implementation time.
- Define the interviewer as an SDK-managed Realtime voice agent and keep its
  instructions, tool policy, and model selection app-owned.
- Let the SDK manage browser Realtime session creation and WebRTC transport.
  Do not manually create `RTCPeerConnection` or call Realtime handshake
  endpoints in V1 app code.
- Accept a normalized session bootstrap input shaped around scope rather than
  question-only data.
- Bind the session to a hidden `<audio autoPlay playsInline>` element or the
  equivalent SDK-managed playback surface used by the current quickstart.
- Add a thin adapter layer that normalizes SDK callbacks or session events into
  a small app-local state surface:
  `ready`, `connecting`, `live`, `completed`, `failed`.
- Keep any finer-grained SDK event detail inside the adapter layer unless the
  UI proves it needs more.
- Normalize transcript updates into app-local events:
  user turn finalized, assistant transcript delta, assistant turn finalized,
  mute changed, connection changed, session failed.
- Normalize recent-changes search results into the same transcript flow so the
  user sees both the spoken summary and visible citations.
- Track current UI stage with a reducer or state machine rather than scattered
  `useState` flags.

## Adapter Boundary

- Keep SDK-specific session wiring inside one hook and one helper module.
- Expose a stable app-facing contract to the page:
  connection state, transcript items, elapsed time, mute state,
  active scope label, start, stop, retry, and cleanup actions.
- If the SDK surface changes later, only the adapter layer should need to
  change; the page and persistence layers should remain stable.

## Best Practices

- Do not bypass the SDK with a parallel low-level WebRTC path in V1.
- Do not store raw microphone audio locally.
- Add explicit cleanup for microphone tracks, SDK session objects, and audio
  elements.
- Provide a small autoplay fallback message if the browser blocks remote audio
  playback.
- Avoid binding the page directly to unversioned SDK internals. Keep the app on
  a normalized adapter interface.
- Keep user-visible state labels small and consistent across the feature.

## Dependencies

- Depends on secure session bootstrap from US-02.
- Blocks transcript UI and persistence stories because it is the source of all
  live session state and transcript updates.
