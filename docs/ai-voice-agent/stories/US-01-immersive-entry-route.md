# US-01: Dedicated Entry and Immersive Route

## Story

As a learner, I want a dedicated voice-help route for a topic so I can
practice in a focused environment without changing the current `Listen`
behavior, while keeping the architecture reusable for playlists and later
questions.

## Acceptance Criteria

1. A new route exists at `/topics/[slug]/mock-interview`.
2. The existing `Listen` button remains untouched.
3. The topic detail page exposes a separate visible CTA that links to the new
   route.
4. The interview route renders without the standard site header and without
   unrelated account or playlist chrome.
5. The interview route does not leak question answers or unrelated scope data
   to the browser.
6. Unauthenticated users are redirected to login before they can access the
   interview page or start the feature.
7. The only visible mock interview CTA in this story lives on the topic detail
   page header in the top-right action area and uses a different icon from
   `Listen`.

## Low-Level Solution Design

- Move the current app shell wrapper from `src/app/layout.tsx` into a `(site)`
  route group.
- Add an `(immersive)` route group for pages that should render without the
  default site header.
- Create a safe server-side scope loader path that can resolve `topic`,
  `playlist`, and later `question` scopes into a common interview scope shape.
- Start with a topic loader based on `getTopicBySlug()` and return only safe
  scope fields such as `slug`, `name`, `shortDescription`, and linked question
  summaries needed for session setup.
- Add the initial mock interview CTA to `src/app/topics/[slug]/page.tsx` in
  the header row, visually similar to the existing ghost icon treatment used
  for `Listen` but with a distinct voice-agent icon such as `Mic`.
- Keep playlist and question CTA rollout disabled for now even though the route
  contract should support them.
- Keep the V1 route flow simple: authenticated entry, ready shell, and live
  interview behavior only as needed for the current session.

## Best Practices

- Do not conditionally hide the header with pathname checks inside the root
  layout; use route groups instead.
- Do not wire the first CTA into the topic listing page. Keep it on the topic
  detail page only so the entry has clear context.
- Do not build a guest-accessible preview page for V1.
- Do not reuse a question-detail payload for the interview page if that would
  send answer content to the client.
- Keep the CTA truthful. It should say the user is starting a mock interview,
  not opening a modal or listening to audio content.

## Dependencies

- Depends on current topic detail routing and topic data utilities.
- Blocks the UI stories because the immersive layout and page shell are the
  foundation for the rest of the feature.
