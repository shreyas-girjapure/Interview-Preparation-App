# AI Voice Agent

Status: Drafted for implementation

This document is now the entry point for the AI voice interview feature.
The implementation-ready story pack lives in `docs/ai-voice-agent/`.

## Core Decisions

- Build V1 around a scoped voice session model, not a question-only model.
- Initial live entry point for testing is `/topics/[slug]/mock-interview`.
- Design the session contract so `topic`, `playlist`, and later `question`
  scopes can all use the same backend and client flow.
- Add the temporary test CTA only on topic detail pages for now.
- Keep the current `Listen` button untouched.
- Use the OpenAI Agents SDK for TypeScript as the primary voice-agent runtime.
- Let the Agents SDK manage browser Realtime transport over WebRTC.
- Do not build or use a runtime MCP server in V1.
- Require sign-in to start a live interview session.
- Persist finalized transcript turns and a written debrief, but not raw audio.
- Defer formal user scoring and cross-session analytics from V1.
- Default to `gpt-realtime-mini`, keep `gpt-realtime` as the premium upgrade
  path, and use `gpt-4o-mini-transcribe` for transcription.
- The agent must stay inside the active session scope and redirect unrelated
  requests back to the current topic, playlist, or question.
- Add a controlled "recent changes" web-search capability, but only for the
  active session scope and never as open-ended browsing.

## Story Pack

- [Overview and implementation order](./ai-voice-agent/README.md)
- [US-01: Dedicated entry and immersive route](./ai-voice-agent/stories/US-01-immersive-entry-route.md)
- [US-02: Secure session bootstrap](./ai-voice-agent/stories/US-02-secure-session-bootstrap.md)
- [US-03: Browser Agents SDK client](./ai-voice-agent/stories/US-03-browser-agents-sdk-client.md)
- [US-04: Immersive interview UI](./ai-voice-agent/stories/US-04-immersive-interview-ui.md)
- [US-05: Transcript persistence and debrief](./ai-voice-agent/stories/US-05-transcript-persistence-and-debrief.md)
- [US-06: Reliability, security, and testing](./ai-voice-agent/stories/US-06-reliability-security-and-testing.md)

## Official OpenAI References

- Agents SDK guide: <https://developers.openai.com/api/docs/guides/agents-sdk/>
- Realtime WebRTC guide: <https://developers.openai.com/api/docs/guides/realtime-webrtc/>
- Voice agents guide: <https://developers.openai.com/api/docs/guides/voice-agents/>
- Realtime server controls: <https://developers.openai.com/api/docs/guides/realtime-server-controls/>
- Realtime API reference: <https://developers.openai.com/api/reference/resources/realtime/>
- MCP guide: <https://developers.openai.com/api/docs/mcp/>

## Notes

- The old draft in this file assumed a modal flow, older ephemeral-token
  wording, and removing the existing `Listen` button. Those assumptions are no
  longer valid.
- The earlier story pack version preferred low-level Realtime WebRTC. That is
  now replaced by an Agents SDK-first implementation plan because OpenAI's
  current docs recommend the Agents SDK as the starting point for browser voice
  agents.
- The earlier story pack version also assumed question-scoped interviews first.
  That is no longer the V1 direction. The feature is now designed around a
  reusable scope contract, with topic-scoped sessions as the first visible
  entry point and playlist support planned on the same foundation.
- Ignore suggestions from `docs/2026-03-08-current-git-review.md` for this
  feature for now. That review document is out of scope for the voice-agent V1
  plan unless explicitly revisited later.
- The new source of truth is the story pack linked above.
