# AI Voice Agent

Status: V1 closed, V2 planning in progress

This document is the entry point for the AI voice interview feature.

- V1 archive and shipped baseline: `docs/ai-voice-agent/`
- V2 epic and follow-on implementation stories: `docs/ai-voice-agent-v2/`
- Cost optimization epic: `docs/ai-voice-agent-cost/`

## Core Decisions

- Build V1 around a scoped voice session model, not a question-only model.
- Initial live entry point for testing is `/topics/[slug]/mock-interview`.
- Design the session contract so `topic`, `playlist`, and later `question`
  scopes can all use the same backend and client flow.
- Add the temporary test CTA only on topic detail pages for now.
- Keep the current `Listen` button untouched.
- Use the OpenAI Agents SDK for TypeScript as the primary voice-agent runtime.
- Let the Agents SDK manage browser Realtime transport over WebRTC.
- Keep Realtime speech-to-speech as a premium runtime lane, but harden it
  explicitly instead of assuming the current baseline is production-stable.
- Add a second server-owned chained voice runtime:
  `gpt-4o-transcribe -> gpt-4.1 / gpt-4.1-mini -> gpt-4o-mini-tts`.
- Do not build or use a runtime MCP server in V1.
- Require sign-in to start a live interview session.
- Persist finalized transcript turns and a written debrief, but not raw audio.
- Defer formal user scoring and cross-session analytics from V1.
- Keep runtime choice server-owned. The browser should not directly pick raw
  Realtime vs chained voice paths.
- The agent must stay inside the active session scope and redirect unrelated
  requests back to the current topic, playlist, or question.
- Add a controlled "recent changes" web-search capability, but only for the
  active session scope and never as open-ended browsing.

## Story Pack

- [V1 archive and story pack](./ai-voice-agent/README.md)
- [V2 epic overview and implementation order](./ai-voice-agent-v2/README.md)
- [Cost optimization epic overview and story order](./ai-voice-agent-cost/README.md)

## Delivery Snapshot

- V1 is now treated as the shipped baseline for topic-scoped voice interviews:
  immersive route, secure bootstrap, browser SDK hookup, live shell,
  transcript, controls, and lifecycle state handling.
- Follow-on work now belongs to V2:
  grounded recent-changes search, prompt-injection hardening, durable
  transcript persistence, server-generated debriefs, active-session policy,
  tracing and observability, playlist scope rollout, Realtime runtime
  hardening, and a chained STT -> LLM -> TTS runtime.
- The V1 archive lives in `docs/ai-voice-agent/README.md`.
- The active planning ledger now lives in `docs/ai-voice-agent-v2/README.md`.

## Official OpenAI References

- Agents SDK guide: <https://developers.openai.com/api/docs/guides/agents-sdk/>
- Realtime WebRTC guide: <https://developers.openai.com/api/docs/guides/realtime-webrtc/>
- Voice agents guide: <https://developers.openai.com/api/docs/guides/voice-agents/>
- Realtime server controls: <https://developers.openai.com/api/docs/guides/realtime-server-controls/>
- Realtime API reference: <https://developers.openai.com/api/reference/resources/realtime/>
- Agent-builder safety guide: <https://developers.openai.com/api/docs/guides/agent-builder-safety/>
- Deep research prompt-injection guidance:
  <https://developers.openai.com/api/docs/guides/deep-research/#prompt-injection-and-exfiltration>
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
- V1 was closed on 2026-03-10 as the baseline release scope. All unfinished
  stretch goals were moved into the new V2 epic instead of remaining as
  ambiguous "partial" work inside the V1 ledger.
- The current source of truth is the V2 epic linked above, with the V1 story
  pack retained as an archive of the shipped baseline and earlier design
  decisions.
