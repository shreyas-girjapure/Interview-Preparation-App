# Interview Preparation App

A Next.js app for interview preparation - question browsing, practice flows, and progress tracking.

## Repository layout

- `src/` - Next.js app source (App Router, components, lib)
- `public/` - static assets
- `docs/` - planning and architecture notes
- `.github/workflows/` - CI pipeline

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

1. Create `.env.local` from `.env.example`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project.
3. Set `SUPABASE_SERVICE_ROLE_KEY` for server-side admin operations only.
4. Keep `NEXT_PUBLIC_APP_URL` as `http://localhost:3000` for local development.

The app validates these variables at runtime and fails fast when values are missing or invalid.

## Quality checks

```bash
npm run lint
npm run format
npm run test
npm run build
```

Or run all checks:

```bash
npm run ci
```

## Deployment notes

- Platform: Vercel
- Build command: `npm run build`
- Install command: `npm ci`
- Required env vars: set all variables listed in `.env.example`
