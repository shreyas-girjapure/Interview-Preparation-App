# Repository Guidelines

## Build, Test, and Development Commands

Use `npm run dev` for local development and `npm run dev:lan` for LAN access. Run `npm run lint`, `npm run format`, `npm run test`, and `npm run build` for quality gates. `npm run ci` runs all four checks. For local Supabase work, use `npm run db:start:local`, `npm run db:migrate:local`, and `npm run db:migrate:local:seed`.

## Project Management & Story Tracking

`docs/PROJECT.md` is the repo-level status file and should reflect the current phase, live work, and follow-ups. Treat story docs as part of the deliverable.

Every active epic should keep a readable status board in its parent README so it is always clear what is `Draft`, `Ready`, `Deferred`, or `Closed`. When implementation changes a story, update both the story file in `docs/.../stories/` and the parent epic README in the same pass. If scope, sequencing, or completion status changes, update the epic snapshot so the repo never loses track of what is finished and what is still open.

## Coding Style, UI, & Reuse

This is a strict TypeScript repo with the `@/*` alias mapped to `src/*`. Follow Prettier defaults: 2-space indentation, double quotes, and trailing commas. Use PascalCase for React components, camelCase for functions and variables, and kebab-case for file names such as `voice-interview-shell.tsx`.

Prefer `shadcn/ui` primitives from `src/components/ui/` before creating custom base components. Extend them through composition, variants, and the shared `cn` utility instead of duplicating markup. Keep components small, prop-driven, and reusable; move shared logic into `src/lib/` or `src/hooks/` so pages stay DRY. Keep route handlers in `route.ts` and non-UI logic out of page components.

## Testing Guidelines

Vitest runs `src/**/*.test.ts` in a Node environment. Keep tests next to the code they cover, for example `src/lib/env.test.ts` or `src/app/api/interview/sessions/route.test.ts`. Add or update tests for new library logic, API behavior, auth rules, and regressions before pushing.

## Communication & Readability

When replying to users, keep answers concise. Avoid long raw paths or URL-heavy prose; use short labels such as `V2 epic README` and separate file references when needed.
For summaries or early discussion, prefer plain language over file-by-file references. Do not overload summaries with inline file links, paths, or implementation citations unless the user explicitly asks for them.

## Security & Configuration Tips

Copy `.env.example` to `.env.local` and never commit secrets. Treat `SUPABASE_SERVICE_ROLE_KEY` as server-only and never expose sensitive values through `NEXT_PUBLIC_*`. Validate untrusted input at API boundaries, enforce auth on the server, and never rely on client-side checks for access control. Prefer least-privilege Supabase clients, keep env parsing in `src/lib/env.ts`, and update `supabase/migrations/`, `supabase/seed.sql`, and `docs/MIGRATION_AND_SCRIPTS.md` together when schema behavior changes.
