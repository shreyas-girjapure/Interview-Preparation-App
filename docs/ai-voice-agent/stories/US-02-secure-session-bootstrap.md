# US-02: Secure Session Bootstrap

## Story

As an authenticated user, I want to start a live AI interview session securely
so that the interviewer persona, active scope, and OpenAI usage are all
controlled by the server.

## Status

- `Status`: Complete for V1 baseline
- `Shipped`: The server owns the prompt, model, voice, env validation, local
  session row creation, safe scope resolution, and the bootstrap payload sent
  to the browser. Runtime MCP remains disabled.
- `Moved to V2`: Scoped recent-changes search and non-topic scope loaders now
  live in the V2 epic instead of remaining inside V1.

Historical note: the acceptance criteria below capture the original broader
story intent. The unfinished stretch items were intentionally moved to V2 when
V1 was closed on 2026-03-10.

## Acceptance Criteria

1. Starting an interview requires an authenticated user.
2. The server creates a local session row before preparing the browser voice
   session bootstrap.
3. The server returns the minimum SDK-compatible browser bootstrap payload and
   local session metadata in one response.
4. The browser cannot send or override the system prompt, tools, or
   answer-aware rubric content.
5. Missing OpenAI env, invalid scope identifiers, and upstream OpenAI failures
   all
   return clear and distinct API errors.
6. Runtime MCP is not configured or enabled in the session payload.
7. The server enforces one active scope per session and instructs the agent to
   redirect unrelated questions back to that scope.
8. Recent-changes search is allowed only for the active scope and only through
   the app's constrained search path.

## Low-Level Solution Design

- Extend `src/lib/env.ts` and `.env.example` to add:
  `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`,
  `OPENAI_REALTIME_TRANSCRIBE_MODEL`, `OPENAI_REALTIME_VOICE`,
  and optional TTL or timeout settings.
- Add the official OpenAI Agents SDK for TypeScript as a new dependency during
  implementation.
- Add a dedicated server module such as `src/lib/ai/voice-agent.ts` to own the
  app's SDK bootstrap logic and model defaults.
- Add a prompt builder such as
  `src/lib/interview/voice-interview-prompt.ts`.
- Add a scope builder such as `src/lib/interview/voice-scope.ts` that resolves
  `topic`, `playlist`, and later `question` scopes into one normalized
  structure.
- Add a recent-changes search helper such as
  `src/lib/interview/recent-changes-search.ts`.
- Add `POST /api/interview/sessions` with request body
  `{ scopeType: "topic" | "playlist" | "question", scopeSlug: string }`.
- Session defaults:
  model `gpt-realtime-mini`, transcription model `gpt-4o-mini-transcribe`,
  voice `alloy`, no runtime MCP, and only the minimum recent-changes search
  capability needed for scoped recency answers.
- The server-built prompt must instruct the model to:
  stay inside the active scope, explain concepts using only the scope context,
  refuse or redirect unrelated asks, avoid turning into a general assistant,
  and end with a concise debrief.
- For `topic` scope, the private scope snapshot should include:
  topic title, short description, related question titles, and allowed concepts
  extracted from the topic's linked material.
- For `playlist` scope, the private scope snapshot should include:
  playlist title, description, linked question titles, and a compact summary of
  the playlist's intended practice area.
- The server bootstrap response should include only safe scope data plus
  whatever short-lived browser session material the current Agents SDK voice
  quickstart requires at implementation time.
- Create the local `interview_sessions` row first, then store any exposed
  OpenAI session metadata after bootstrap succeeds.
- Keep a thin server boundary so the browser uses the SDK, but server-side
  auth, prompt assembly, model choice, and tool policy remain app-owned.
- Add explicit out-of-scope response rules:
  acknowledge briefly, restate the active scope, offer a scoped follow-up, and
  do not continue the unrelated branch.
- Preferred search design:
  keep the main coach specialized, and route recency requests to a specialized
  recent-changes search agent or a server-owned constrained search tool that
  uses OpenAI's web search capability underneath.
- Search query policy:
  derive the search query from the scope snapshot plus recency intent, for
  example active topic name plus release, update, latest, changes, or breaking
  changes.
- Search result policy:
  return a concise grounded summary, preserve citations, and then hand control
  back to the main scoped coach.

## Best Practices

- Keep all answer-aware content server-only.
- Keep scope resolution server-side. The browser should never decide what the
  allowed scope context is.
- Do not give the main voice coach unrestricted web search.
- Prefer a specialized search path over a general-purpose browsing tool.
- Fail fast on env or auth issues before attempting OpenAI calls.
- Use explicit HTTP status codes rather than a single generic error response.
- Follow the current Agents SDK voice quickstart when implementing the bootstrap
  payload. Do not freeze the document to unverified package internals.
- Treat scope drift as a product bug, not as acceptable assistant behavior.
- Treat web results as untrusted and summarize them conservatively.

## Dependencies

- Depends on the immersive route from US-01.
- Blocks the browser Agents SDK client because the client cannot connect
  without the local session bootstrap.
