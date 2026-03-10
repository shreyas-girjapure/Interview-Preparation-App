# V2-US-06: Playlist-Scoped Voice Interviews

## Story

As a learner, I want to launch a voice interview from a playlist so I can
practice a curated set of related questions in one scoped live session and
reuse the same session, search, persistence, and telemetry pipeline already
proven on topic scope.

## Status

- `Status`: Ready for implementation
- `Why this exists`: the backend contract already exposes
  `scopeType: "playlist"`, but the resolver, immersive route, and UI still
  behave as topic-only.
- `Current baseline`: published playlists can already be fetched by slug via
  `getPlaylistBySlug`, but `resolveVoiceInterviewScope` returns `undefined` for
  playlist scope and no immersive playlist route exists.
- `Implementation note`: this story should reuse the topic voice pipeline, not
  create a second playlist-only stack.

## Acceptance Criteria

1. `POST /api/interview/sessions` continues to accept only
   `{ scopeType, scopeSlug }`, and playlist interviews use
   `{ scopeType: "playlist", scopeSlug: playlist.slug }`.
2. `resolveVoiceInterviewScope({ scopeType: "playlist" })` returns a
   normalized playlist scope snapshot for published playlists that have at
   least one published question.
3. The normalized playlist scope snapshot includes enough shared fields for the
   prompt builder, runtime shell, transcript citations, persistence, and back
   navigation without hardcoded topic routes.
4. A signed-in learner can launch `/playlists/[slug]/mock-interview` from the
   playlist detail page and land in the same ready, live, completed, and failed
   shell used for topic scope.
5. Route metadata, shell labels, transcript placeholder citations, and back
   navigation all identify the session as `Playlist scope` and point back to
   `/playlists/[slug]`.
6. Scoped recent-changes lookup from `V2-US-01`, when invoked during playlist
   scope, stays bounded to playlist-linked questions and topics. If the query
   planner cannot anchor the request to the playlist, it falls back instead of
   broadening.
7. Empty, unpublished, malformed, or missing playlists never create a live
   voice session and return clear route or API failures.
8. Transcript persistence, session policy, and telemetry from `V2-US-03`
   through `V2-US-05` work for playlist sessions without introducing a separate
   playlist persistence model.

## Low-Level Solution Design

### Scope Model

- Replace the topic-only `VoiceInterviewScope` shape with a discriminated union
  or shared base type.
- Keep the shared fields already consumed by the prompt and runtime:
  `scopeType`, `scopeLabel`, `slug`, `title`, `summary`, `stayInScope`,
  `expectations`, `evaluationDimensions`, `starterPrompts`, `questionMap`, and
  `questionSummaries`.
- Add route and citation metadata so downstream code stops hardcoding topic
  URLs:
  `detailHref`, `backHref`, and `primaryCitationLabel`.
- Add playlist-only metadata needed for scoped search and operator context:
  `playlistId`, `accessLevel`, `totalItems`, `topicLabels`, `topicSlugs`,
  `categoryLabels`, and `subcategoryLabels`.
- Keep the public browser contract unchanged. The session row should continue to
  persist the resolved scope snapshot in `scope_snapshot`.

### Playlist Scope Resolution

- Add `getPlaylistVoiceInterviewScopeBySlug(slug)` in
  `src/lib/interview/voice-scope.ts`.
- Build it from `getPlaylistBySlug(slug)` and the ordered playlist questions
  already returned there.
- Scope resolution rules:
  - return `undefined` when the slug is blank, the playlist is missing, or the
    playlist has zero published questions
  - use playlist title and description as the primary scope title and summary
  - derive `questionMap` from the first 4 to 6 ordered playlist questions
  - derive `questionSummaries` from the same capped ordered list so scope
    snapshots stay small and prompt-safe
  - derive `topicLabels`, `topicSlugs`, `categoryLabels`, and
    `subcategoryLabels` by unioning values already present on playlist question
    summaries
- Suggested scope framing:
  - stay inside the playlist title and its linked questions or topics
  - compare related questions when useful, but do not drift into unrelated
    interview areas
  - if the learner jumps outside the playlist practice lane, redirect to one of
    the linked questions
- Suggested evaluation framing:
  - cross-question synthesis
  - practical examples across related questions
  - scope discipline during recency follow-ups

### UI and Route Structure

- Add `src/app/(immersive)/playlists/[slug]/mock-interview/page.tsx`.
- Mirror the topic route:
  - resolve playlist scope on the server
  - generate metadata from the resolved scope
  - require a signed-in user before rendering the live route
  - honor the preview `stage` query param for the demo adapter, just like topic
    scope
- Extract `TopicVoiceInterviewExperience` into a shared client component such
  as `ScopedVoiceInterviewExperience`, or add a sibling playlist experience
  component only if the shared extraction becomes noisy.
- Use scope-owned navigation metadata:
  - topic back link remains `/topics/[slug]`
  - playlist back link becomes `/playlists/[slug]`
- Update the playlist detail page to expose a `Start mock interview` CTA when
  the playlist resolves to a valid voice scope.
- Hide or disable the CTA when the playlist has no valid published questions.

### Prompt, Transcript, and Citation Compatibility

- Remove topic-specific literals from shared runtime helpers:
  - `Topic brief` should become a scope-owned label such as `Scope brief`
  - `/topics/${scope.slug}` should become `scope.detailHref`
- `buildVoiceInterviewPrompt`, `buildVoiceInterviewSessionSnapshot`, and
  `buildVoiceInterviewScopedCitations` should remain generic over shared scope
  fields and never assume topic routes.
- Playlist placeholder citations should point to:
  - the playlist detail page as the primary scope citation
  - the first linked question when available as a secondary citation
- Recovery copy and completion copy should say `playlist scope` when
  `scopeType === "playlist"`.

### Search and Safety Behavior

- Reuse the `V2-US-01` query planner and `V2-US-02` safety model.
- For playlist scope, search planning should use:
  - playlist title
  - playlist description
  - ordered question titles
  - linked topic, category, and subcategory labels when available
- Do not widen into general browsing just because a playlist contains multiple
  related questions.
- If the planner cannot identify a bounded official-docs search path from the
  playlist context, return the normal fallback instead of treating the playlist
  as one broad knowledge area.

### Persistence, Policy, and Observability Integration

- `interview_sessions.scope_type` already supports `playlist`; keep using that.
- `scope_snapshot` should persist the resolved playlist scope exactly as used by
  the prompt and UI.
- Transcript persistence from `V2-US-03` keeps the same table and API shape.
  Only the stored scope snapshot and route links differ.
- The one-live-session guard from `V2-US-04` remains user-wide, not topic-only.
- Telemetry and traces from `V2-US-05` must record
  `scopeType: "playlist"` and `scopeSlug: playlist.slug`.

### Error Handling and Access Rules

- Route behavior:
  - missing or unpublished playlist slug -> `notFound()`
  - unauthenticated learner ->
    redirect to `/login?next=/playlists/[slug]/mock-interview`
- API behavior:
  - unresolved playlist scope -> `404 invalid_scope`
  - auth failure -> the same `401 unauthorized` shape already used by topic
    scope
- Do not introduce new entitlement logic in this story.
- Respect the same published-playlist visibility rules currently used by
  `getPlaylistBySlug`.
- If paid or private playlist gating is added later, it should plug into
  playlist scope resolution rather than changing the voice route contract.

### Implementation Targets

- `src/lib/interview/voice-scope.ts`
- `src/lib/interview/playlists.ts`
- `src/lib/interview/voice-interview-prompt.ts`
- `src/lib/interview/voice-interview-runtime.ts`
- `src/lib/interview/voice-interview-session.ts`
- `src/app/(immersive)/playlists/[slug]/mock-interview/page.tsx`
- `src/app/(immersive)/topics/[slug]/mock-interview/_components/topic-voice-interview-experience.tsx`
- `src/app/(immersive)/playlists/[slug]/mock-interview/_components/...` or a
  shared extracted experience component
- `src/app/(site)/playlists/[slug]/page.tsx`
- `src/app/api/interview/sessions/route.ts`
- `src/app/api/interview/sessions/route.test.ts`

## Best Practices

- Reuse the topic pipeline. Only scope resolution, route wiring, and shared
  scope metadata should differ.
- Keep playlist scope curated and bounded. A playlist is a practice lane, not a
  free-form assistant.
- Cap scope snapshot size so large playlists do not balloon prompts or session
  rows.
- Move route and citation metadata onto the scope object instead of scattering
  `if scopeType === "playlist"` checks across the UI.
- Do not start question-scoped expansion as part of this story.

## Required Testing

- `resolveVoiceInterviewScope` returns a normalized playlist scope for a valid
  published playlist and `undefined` for an empty or missing playlist.
- The playlist immersive route renders ready, connecting or preview, live,
  failed, and completed states using the same shell components.
- The playlist launch CTA only appears when playlist scope can resolve cleanly.
- The session bootstrap API creates `playlist` sessions without changing
  current topic behavior.
- Placeholder citations and back links switch to playlist URLs when
  `scopeType === "playlist"`.
- Playlist search planning remains bounded to playlist-linked context and falls
  back when anchoring is weak.
- Transcript persistence and telemetry store `scopeType: "playlist"` without
  breaking topic sessions.

## Dependencies

- Depends on `V2-US-01` through `V2-US-05`.
- Keeps `question` scope out of V2 unless explicitly reprioritized later.
