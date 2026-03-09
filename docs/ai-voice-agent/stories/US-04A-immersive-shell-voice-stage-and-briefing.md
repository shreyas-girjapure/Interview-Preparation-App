# US-04A: Immersive Shell, Voice Stage, and Briefing

## Story

As a learner, I want the approved interview shell, voice stage, and scope
briefing implemented so the live experience feels deliberate before transcript
and control wiring are layered in.

## Status

- `Status`: Complete
- `Shipped`: The production shell, stage, and briefing modules now render on
  the live topic interview route with the approved desktop and mobile layout.
- `Pending`: None for this story beyond normal visual polish.

## Acceptance Criteria

1. Desktop renders the approved shell structure with dedicated regions for
   briefing, voice stage, and transcript or controls slots.
2. Mobile renders the approved stacked shell while preserving hierarchy and
   spacing from the mock review.
3. The live page shows the current state such as `Ready`, `Connecting`,
   `Live`, `Completed`, or `Failed` in the voice stage.
4. The briefing area shows scope title, scope type, summary, expectations, and
   a short stay-in-scope explanation.
5. Loading, failure, and completion treatments for the shell and voice stage
   match the approved mock direction.
6. The shell supports keyboard navigation, visible focus styles, and reduced
   motion.

## Low-Level Solution Design

- Build production components for:
  `VoiceInterviewShell`, `VoiceStage`, and `InterviewBriefingCard`.
- Keep transcript and controls as explicit child slots or adjacent modules so
  US-04B can attach without rewriting the shell.
- Bind shell-level state labels and helper copy to the normalized adapter
  contract from US-03 rather than raw SDK internals.
- Reuse the approved structure from US-04 as the visual source of truth.
- Keep the route page responsible for composition while leaf components remain
  focused on rendering and local UI behavior.
- Use existing shadcn primitives and the repo's established design language for
  layout, badges, separators, alerts, and buttons.

## Best Practices

- Keep shell props narrow and stable so transcript and persistence work can plug
  into the page later without churn.
- Tie motion to meaningful state changes and speaking activity rather than
  decoration.
- Avoid letting the shell own transcript sequencing, persistence, or debrief
  logic.
- Preserve the approval boundary from US-04. If the live implementation needs a
  visual change, reflect it back into the mock story before expanding scope.

## Dependencies

- Depends on live session state from US-03.
- Depends on approved mocks from US-04.
- Provides the UI foundation for US-04B.
