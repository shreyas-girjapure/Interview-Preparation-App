# Interview Preparation App

A Next.js app for interview preparation — question browsing, practice flows, and progress tracking.

## Repository layout

- `src/` — Next.js app source (App Router, components, lib)
- `public/` — static assets
- `docs/` — planning and architecture notes
- `.github/workflows/` — CI pipeline

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

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
- Required env vars: copy from `.env.example`
