# US-04: Interview Experience Mocks and Approval

## Story

As the product team, we want high-fidelity interview mocks reviewed before real
UI wiring starts so layout, copy, and interaction expectations are aligned
before implementation.

## Status

- `Status`: Complete
- `Shipped`: The dedicated mock route, local fixture data, desktop and mobile
  layouts, representative lifecycle states, transcript samples, and citation
  treatment are all present and mirror the production module split.
- `Pending`: None for code delivery. Any future visual change should still be
  reflected in the mock route before widening scope.

## Acceptance Criteria

1. Static desktop mocks show the approved three-panel structure:
   briefing, voice stage, and transcript plus controls.
2. Static mobile mocks show the approved stacked layout with the same content
   hierarchy preserved.
3. The mock set includes representative `Ready`, `Connecting`, `Live`,
   `Completed`, and `Failed` states.
4. The mocks include realistic transcript samples, scope labels, and an example
   recent-changes citation treatment.
5. The mock route is driven entirely by local mock data rather than live SDK,
   persistence, or API wiring.
6. The approved mock structure clearly splits follow-on implementation into at
   least two modules: shell or briefing and transcript or controls.
7. UI implementation does not begin until the mocks are reviewed and explicitly
   approved in-thread.

## Low-Level Solution Design

- Use `src/app/home-mocks/voice-interview/page.tsx` as the primary review
  surface for the mock experience.
- Drive the page from static fixtures for scope summary, transcript items,
  citations, and session state rather than any live interview hook.
- Split the mock composition into reusable pieces that map directly to later
  implementation work:
  `VoiceInterviewShellFrame`, `VoiceStageMock`, `InterviewBriefingMockCard`,
  `TranscriptMockPanel`, and `SessionControlMockBar`.
- Show how state-specific variants affect layout and copy without binding them
  to a real session lifecycle yet.
- Keep the topic detail CTA in scope for the mock review, but do not wire it to
  a live session in this story.
- Treat this story as an approval artifact, not a production-ready integration
  story.

## Best Practices

- Match the repo's warm editorial palette and typography instead of using a
  generic dark-purple AI dashboard aesthetic.
- Keep transcript readable at all times so the team is validating a real voice
  plus text experience rather than an orb-only concept.
- Treat mobile as a first-class layout, not a collapsed desktop afterthought.
- Make the scope visible enough in the mocks that a user understands why an
  unrelated request would be redirected.
- Show source links for recency answers so the citation treatment is approved
  before implementation.
- Keep the mock data intentionally simple so the review stays focused on UI
  structure, copy, and flow.

## Dependencies

- Depends on the route direction from US-01 and the session-state contract
  defined in US-03.
- Blocks both modular UI implementation stories until the mocks are reviewed
  and approved.
