# Roadmap

Last updated: 2026-02-17

## Phase 1 — Foundation ✅

**Goal:** Ship a working topic-first interview prep app with auth, content, and admin tooling.

- ✅ Auth + account flows (Google OAuth via Supabase)
- ✅ Topic catalog and overview pages with related questions/topics
- ✅ Question pages with structured markdown answers and code highlighting
- ✅ 4-level taxonomy: Category → Subcategory → Topic → Question
- ✅ Question types (standard, scenario, code_review) and seniority levels
- ✅ Admin content composer (`/admin`) with live preview and publish workflow
- ✅ Content API with Zod validation, dedup warnings, slug auto-generation
- ✅ Salesforce seed content (7 subcategories, topics, questions with answers)
- ✅ Content generation templates (`content/templates/`)
- ✅ CI pipeline + pre-push git hook enforcing `npm run ci`
- ✅ Dev and production Supabase environments with Vercel deployment

---

## Phase 2 — Content Depth (Current)

**Goal:** Fill out the Salesforce content library and harden the admin experience.

### Content Expansion

- [ ] Seed remaining Salesforce subcategory topics (LWC, Data Modeling, Integration, Automation, Dev Practices)
- [ ] Generate questions and answers for each topic using content templates
- [ ] Add topic graph edges (prerequisites, related, deep_dive) for Salesforce topics
- [ ] Build out 50+ questions with structured answers across all seniority levels

### Admin Improvements

- [ ] Harden admin composer validations and error messages
- [ ] Topic-edge management UI in admin (create/edit prerequisite/related links)
- [ ] Bulk import UI or improved CSV/SQL seeding workflow
- [ ] Edit existing questions/answers from admin (currently create-only)

---

## Phase 3 — Learner Features

**Goal:** Add engagement features that help learners retain knowledge and prepare efficiently.

### Playlists

- [ ] Playlist CRUD UI for admins (create, add questions, reorder, publish)
- [ ] Playlist browse/detail pages for learners
- [ ] Role-based playlists (e.g., "Salesforce Developer Interview Prep")
- [ ] Company-based playlists (e.g., "Deloitte SF Questions")

### Spaced Repetition

- [ ] Review queue page: questions due for review
- [ ] "Got It" / "Review Later" controls on question pages
- [ ] Ease factor scheduling (SM-2 inspired algorithm)
- [ ] Progress dashboard: review stats, streak tracking

### UX Polish

- [ ] Seniority filter on topic and question pages
- [ ] Question type badges and filtering
- [ ] Reading progress indicators on topic pages
- [ ] Mobile-optimized reading experience

---

## Phase 4 — Scale

**Goal:** Automate content creation and expand beyond Salesforce.

### LLM Ingestion Pipeline

- [ ] Create ingestion staging tables (`ingest_batches`, `ingest_raw_questions`, etc.)
- [ ] Build moderation queue UI for reviewing LLM suggestions
- [ ] Implement promotion workflow: staging → review → canonical tables
- [ ] Integrate content generation templates into ingestion pipeline

### Crawler Discovery

- [ ] Define crawler sources for interview question discovery
- [ ] Build raw question collection with source attribution
- [ ] Review gate before any content enters canonical tables

### Multi-Category Expansion

- [ ] Add JavaScript/TypeScript category with subcategories and topics
- [ ] Add System Design category
- [ ] Evaluate additional categories based on user demand

### Monetization (Future)

- [ ] Playlist access levels (free/preview/paid) enforcement
- [ ] Payment integration for premium content
- [ ] Free tier vs paid tier content gating
