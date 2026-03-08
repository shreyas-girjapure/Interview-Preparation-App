# Current Git Review

Date: 2026-03-08

## Scope

Reviewed the current uncommitted changes in:

- `src/app/globals.css`
- `src/app/playlists/[slug]/playlist-actions-client.tsx`
- `src/app/playlists/create-playlist-modal.tsx`
- `src/app/playlists/playlist-actions.ts`
- `src/components/question-progress-header.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/save-to-playlist-dialog.tsx`

Repo context checked as part of the review:

- `src/app/playlists/[slug]/playlist-actions.ts`
- `src/app/playlists/page.tsx`
- `src/app/questions/[slug]/page.tsx`
- `src/app/admin/playlists/page.tsx`
- `src/app/api/playlists/route.ts`
- `src/app/api/playlists/items/route.ts`
- `src/lib/interview/playlists.ts`
- `src/lib/auth/roles.ts`
- `supabase/migrations/20260307000000_initial_schema.sql`
- `docs/PROJECT.md`

## Findings

1. High: the new UI marks user-owned playlists as `private`, but the write path currently creates them as public published playlists.

Evidence:
`src/app/playlists/playlist-actions.ts:60-67` sets user-created playlists to `status: "published"` with `published_at`.
`supabase/migrations/20260307000000_initial_schema.sql:356-379` has no privacy field on `playlists`.
`supabase/migrations/20260307000000_initial_schema.sql:1212` allows any published playlist to be selected.
`src/lib/interview/playlists.ts:412-419` loads all published playlists into the public playlists dashboard.
`src/components/save-to-playlist-dialog.tsx:197-202` renders owner playlists with a lock icon and the label `private`.

Why it matters:
This is a privacy and trust issue, not just a wording issue. A learner can create a playlist that the product later exposes publicly while another part of the UI explicitly tells them it is private.

Recommendation:
Decide the actual product model first. If learner playlists are private, stop publishing them by default and update the read paths accordingly. If learner playlists are public, remove the `private/public` label from this dialog immediately and replace it with a truthful concept such as `owned` / `shared` only if that state actually exists in the data model.

2. High: the new question-page mutation path lets admins and editors modify any playlist from a learner-facing surface, bypassing the stricter edit flow that already exists.

Evidence:
`src/app/playlists/playlist-actions.ts:179-200` treats admin/editor as global modifiers and does not block `is_system` playlists.
`src/app/playlists/playlist-actions.ts:204-242` inserts and deletes playlist items directly from that path.
`src/app/playlists/[slug]/playlist-actions.ts:67-149` already has a dedicated `requireEditablePlaylist` guard and a clearer edit flow.
`docs/PROJECT.md:34` says playlist creation is live for learners.
`docs/PROJECT.md:44` separately tracks admin playlist CRUD as the admin roadmap item.

Why it matters:
This expands the blast radius of a casual question-page action. An admin or editor browsing a normal question page can now mutate curated playlists, including system playlists, without going through the admin playlist workflow, sort controls, or any confirmation tailored for global content.

Recommendation:
Reuse the existing permission model from `src/app/playlists/[slug]/playlist-actions.ts` and keep the question-page dialog scoped to owner-created non-system playlists. If admins need bulk curation from question pages, make that a separate explicit admin flow.

3. Medium: `toggleQuestionInPlaylist` trusts raw `questionId` input and does not validate that the question is published or even allowed for the caller.

Evidence:
`src/app/playlists/playlist-actions.ts:165-242` accepts `playlistId`, `questionId`, and `isAdding` and writes directly to `playlist_items`.
`supabase/migrations/20260307000000_initial_schema.sql:1191-1193` only checks playlist ownership on insert; it does not constrain which question may be inserted.
`src/app/playlists/[slug]/playlist-actions.ts:192-219` already validates question IDs against published questions before updating playlist membership.

Why it matters:
This is an authorization and data-integrity gap. UI constraints are not a sufficient security boundary. A crafted server-action invocation can attempt to attach unpublished or otherwise invalid questions to a playlist. Even if later read paths filter some of them out, the write model is still incorrect.

Recommendation:
Mirror the published-question validation used in `updateUserPlaylist`, or better, move both flows to one shared validation helper or a SQL function that performs ownership plus question-visibility checks atomically.

4. Medium: creating a playlist is non-transactional, so failures during item insertion can leave behind orphan public playlists while the UI reports failure.

Evidence:
`src/app/playlists/playlist-actions.ts:58-72` inserts the playlist first.
`src/app/playlists/playlist-actions.ts:82-99` inserts playlist items afterward and returns `ok: false` if that second step fails, without cleanup or rollback.

Why it matters:
This produces inconsistent state and is harder to reason about as the app scales. A user can see a failure toast while the database already contains a published playlist row.

Recommendation:
Move playlist creation plus initial item insertion into one transactional database function, or explicitly delete the newly-created playlist on item insert failure before returning.

5. Medium: the signed-out "Add to playlist" flow is currently misleading and the empty state is a dead end.

Evidence:
`src/components/question-progress-header.tsx:99-113` opens `SaveToPlaylistDialog` without checking authentication.
`src/components/save-to-playlist-dialog.tsx:60-67` skips loading when `isAuthenticated` is false, but still renders the dialog.
`src/components/save-to-playlist-dialog.tsx:229-238` falls through to a `No playlists yet` empty state instead of a sign-in or create flow.

Why it matters:
Signed-out users are shown an absence-of-data message for a capability they are not authorized to use. That is both a UX bug and an implementation smell because the state machine conflates `unauthenticated` with `empty`.

Recommendation:
Block dialog open for signed-out users and reuse the same sign-in redirect/toast pattern already used in `src/app/playlists/create-playlist-modal.tsx:57-67`. If the dialog stays open for signed-out users, it needs a dedicated unauthenticated state with a sign-in CTA.

6. Medium: the new `CreatePlaylistModal` API was partially generalized, but the rest of the flow was not finished.

Evidence:
`src/app/playlists/create-playlist-modal.tsx:25-30` adds `trigger`, `defaultSelected`, and `onSuccess`.
`src/app/playlists/create-playlist-modal.tsx:95-99` now allows submit with zero selected questions when no picker data is passed.
`src/app/playlists/playlist-actions.ts:39-40` still hard-requires at least one question server-side.
`src/app/playlists/page.tsx:199-202` is still the only current callsite.
`src/components/save-to-playlist-dialog.tsx:229-238` has an empty-state message that clearly wants a create-playlist CTA but does not use the new modal API.

Why it matters:
The component contract now suggests reusable question-page creation, but the backend rules and callsites do not actually support that flow yet. This is the sort of half-finished abstraction that tends to confuse future contributors.

Recommendation:
Either complete the integration by wiring `CreatePlaylistModal` into the save dialog empty state with `defaultSelected={[questionId]}` and `onSuccess={loadPlaylists}`, or keep the modal API narrow until that use case is implemented end to end.

7. Medium: there is a visible `Listen` button on question pages with no behavior behind it.

Evidence:
`src/components/question-progress-header.tsx:77-80` renders a `Button` with `PlayCircle` and `sr-only` text `Listen`.
There is no `onClick`, no audio hook, and no other repo usage of audio or speech functionality tied to this control.

Why it matters:
This is a broken affordance and an accessibility problem. Users can tab to a control that appears functional but does nothing.

Recommendation:
Remove the button until the feature exists, or wire it to a real handler and loading state in the same change.

8. Medium: the new save dialog loads all accessible playlists eagerly and only paginates on the client, which does not scale well and gets worse under the current admin/editor behavior.

Evidence:
`src/app/playlists/playlist-actions.ts:137-147` fetches the full playlist set with nested `playlist_items`.
`src/components/save-to-playlist-dialog.tsx:75-76` paginates only after loading everything into memory.
`src/components/save-to-playlist-dialog.tsx:213-220` uses `Load more` against that already-loaded list.

Why it matters:
This is acceptable for a handful of learner-owned playlists, but not for admin/editor visibility across many playlists. It also front-loads cost on every dialog open instead of paying only for what is visible.

Recommendation:
Keep the question-page dialog owner-only, or add server-side search/pagination if cross-playlist admin access is truly required. Either way, avoid making the learner UI depend on unbounded playlist scans.

9. Low: playlist creation and management rules are now duplicated across multiple server surfaces with different semantics.

Evidence:
`src/app/playlists/playlist-actions.ts:25-107` creates a published playlist and requires `questionIds`.
`src/app/api/playlists/route.ts:72-93` creates a playlist with no questions and relies on DB defaults.
`src/app/api/playlists/items/route.ts:38-105` has yet another ownership and mutation path.
`src/app/playlists/[slug]/playlist-actions.ts:67-337` contains a separate permission and validation model again.

Why it matters:
As the codebase grows, duplicated business rules drift. The repo already shows that happening: creation visibility, question validation, and ownership checks are not aligned across the current write paths.

Recommendation:
Consolidate playlist writes behind a shared server module or a small set of database-backed mutation functions. The existing `[slug]` playlist action file is the strongest foundation to build on because it already centralizes validation more carefully.

## Quality Gaps

- `npm run lint` passed.
- `npm run test` passed.
- `npm run build` passed.
- `npm run format` failed. Prettier currently reports style issues in:
  `src/app/globals.css`
  `src/app/playlists/create-playlist-modal.tsx`
  `src/app/playlists/playlist-actions.ts`
  `src/components/question-progress-header.tsx`
  `src/components/save-to-playlist-dialog.tsx`
  `src/components/ui/dialog.tsx`

- There are no tests covering the new question-page playlist mutations, the signed-out dialog state, the privacy/visibility semantics, or the admin/editor authorization edge cases. Those are the areas most likely to regress.

## What Looks Solid

- `src/app/playlists/[slug]/playlist-actions.ts` is a better reference implementation than the new action file. It already normalizes input, validates question visibility, and centralizes playlist edit permission checks.
- The new question dialog uses optimistic UI with rollback in `src/components/save-to-playlist-dialog.tsx:88-119`, which is the right interaction model once the authorization and state-model issues are fixed.
- The current diff still compiles and passes lint/tests/build, so the main concerns are correctness, product semantics, and long-term design consistency rather than raw type safety.

## Suggested Fix Order

1. Fix the privacy model first. Remove the misleading `private/public` label or change the persistence/read model so it is true.
2. Restrict the question-page save flow to owner-created non-system playlists and reuse the existing edit permission helper.
3. Add published-question validation and transactional writes to the new server actions.
4. Fix the signed-out state and wire the empty state to a real create-playlist path.
5. Remove the dead `Listen` button.
6. Run Prettier and add tests for the new mutation/auth flows before merging.
