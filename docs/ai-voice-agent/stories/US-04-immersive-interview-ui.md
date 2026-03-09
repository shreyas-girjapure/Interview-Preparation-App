# US-04: Immersive Interview UI

## Story

As a learner, I want a polished interview page with clear voice states, visible
transcript, and focused controls so the feature feels intentional and easy to
use on both desktop and mobile while staying anchored to the current session
scope.

## Acceptance Criteria

1. Desktop renders a three-panel layout: briefing, voice stage, transcript.
2. Mobile renders a compact top bar, central voice stage, and stacked transcript
   plus briefing content with strong hierarchy.
3. The page always shows a clear current state such as `Ready`,
   `Connecting`, `Live`, `Completed`, or `Failed`.
4. The transcript stays visible during the session and is not hidden behind an
   orb-only UI.
5. The page supports keyboard navigation, visible focus styles, and reduced
   motion.
6. Error, loading, and completion states feel designed rather than accidental.
7. The page clearly labels the active session scope such as topic or playlist.

## Low-Level Solution Design

- Build these client components:
  `VoiceInterviewShell`, `VoiceStage`, `InterviewBriefingCard`,
  `LiveTranscriptPanel`, `SessionControlBar`, and `PostInterviewDebrief`.
- Use shadcn components for structure and controls:
  `Button`, `Badge`, `Card`, `Separator`, `Tabs`, `AlertDialog`,
  `Skeleton`, and the existing toast system.
- Voice stage contents:
  current state label, subtle animated orb or waveform,
  short helper copy, and mic status.
- Briefing panel contents:
  scope title, summary, scope type badge, interview expectations,
  evaluation dimensions, and a short "stay in scope" explanation.
- Transcript panel contents:
  speaker labels, auto-scroll, incremental assistant text,
  finalized user turns, completion state, and visible citations for any recent
  changes search response.
- Bottom control tray contents:
  mute or unmute, end session, retry after failure.
- On the topic detail page, expose the initial mock interview CTA in the
  top-right header area. It should visually match the existing ghost icon
  action style, use a distinct voice-agent icon, and have an accessible label
  such as
  `Start topic voice coach`.
- Do not add a guest preview state or a separate discovery mode in V1.

## Best Practices

- Match the repo's warm editorial palette and typography instead of using a
  generic dark-purple AI dashboard aesthetic.
- Tie motion to state changes and speaking activity instead of pure decoration.
- Keep transcript readable at all times. Current voice products increasingly
  combine voice with live text, and this app should follow that direction.
- Treat mobile as a first-class layout, not a collapsed desktop afterthought.
- Make the scope visible in the UI enough that a user understands why an
  unrelated request is being redirected.
- Show source links for recency answers so the user can inspect what the search
  summary relied on.

## Dependencies

- Depends on the route shell from US-01 and live session state from US-03.
- Blocks the final implementation review because this is the main user-facing
  surface of the feature.
