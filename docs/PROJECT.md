# Project Documentation

Last updated: 2026-03-12

## 1. Project Overview & Problem Statement

The app is a topic-first interview preparation product. Users start from a
topic, read a concise overview, jump to related questions, and continue
learning through linked topics.
Most interview prep tools are question-by-question only and do not help
learners follow connected concepts; this app bridges that gap.

### Live Features

- **Topic-first Learning:** Answers expose key topics as links. Topics include
  overviews, related questions, and related topics.
- **Readable Answers:** Code examples with syntax highlighting. Answer formats:
  standard Q&A, scenario-based, and code review.
- **Taxonomy:** 4-level hierarchy (Category -> Subcategory -> Topic ->
  Question). Questions have types and seniority levels.
- **Progress Tracking:** Mark topics/questions as read.
- **Admin Composer:** Role-gated at `/admin`. Create/link topics, draft ->
  preview -> publish workflow.

## 2. Immediate To-Dos

1. Add Edit functionality for question's answer in same page if role is admin.
2. Add Edit for Playlists in playlist page, if role is admin.
3. Add Edit for Topics in topic page, if role is admin.
4. Continue AI voice interview V2 after shipping the narrowed Salesforce
   grounding slice: `V2-US-11`, `V2-US-05`, and `V2-US-09` are the next
   follow-ons.

## 3. Roadmap & Tracking

### Phase 1 - Foundation (Done)

Shipped core app with auth (Google OAuth via Supabase), topic catalog,
question taxonomy, admin content composer, Vercel deployment, and CI pipeline.

### Phase 2 - Content Depth & Early Learner Features (Current)

**Goal**: Fill out Salesforce content library, harden admin experience, and
roll out Playlists.

- **Playlists:** Browsing, detail pages, and playlist creation are live for
  learners.
- **Content:** Seed remaining Salesforce subcategory topics.
- **Content:** Generate questions and answers via content templates.
- **Edges:** Add topic graph edges (prerequisites, related, deep_dive).
- **Admin:** Harden validations and build topic-edge management UI.

### Phase 3 - Learner Engagement (Next)

**Goal**: Features to help learners retain knowledge.

- **Admin Playlists:** Complete edit/CRUD UI for admins on Playlists.
- **Spaced Repetition:** Review queue, "Got It" / "Review Later" controls, SM-2
  inspired scheduling.
- **UX Polish:** Seniority/type badges, filters, reading progress indicators.

### Parallel Track - AI Voice Interviews (Current)

**Goal**: Turn mock interviews into a grounded, supportable voice experience.

- **Shipped:** V2-US-10 Salesforce pre-session documentation grounding now
  performs one official-doc startup warmup, shares the brief across both voice
  runtime lanes, supports speculative prewarm on mock-interview intent, and
  now runs with stronger model defaults plus larger response budgets across the
  voice stack. Grounded Realtime startup now also emits one clean opening turn,
  and chained cost snapshots have baseline default model rates instead of empty
  rate lookups.
- **Next:** Improve grounded turn steering (`V2-US-11`), deepen observability
  and support correlation (`V2-US-05`), and keep session takeover recovery
  ready if it becomes the next product gap (`V2-US-09`).

### Phase 4 - Scale (Future)

**Goal**: Automate content creation and expand beyond Salesforce.

- **LLM Ingestion Pipeline:** Staging tables, moderation queue UI, automated
  generation tools.
- **Crawler Discovery:** Collect raw questions from outside sources.
- **Multi-Category:** JavaScript/TypeScript, System Design.

## 4. Schema Plan Base: Content Taxonomy

The schema relies on a specific hierarchy and LLM-assisted ingestion strategy.

**Final Hierarchy:**

- `categories` (e.g. Salesforce)
- `subcategories` (e.g. Apex Programming)
- `topics` (e.g. Apex Triggers)
- `questions` (linked via `question_topics` to allow cross-category
  references)

**LLM-Assisted Ingestion Strategy:**

1. Collect raw question text.
2. Run dedup check and propose topics (LLM).
3. Human review -> generate edges -> generate questions/answers (LLM).
4. Human review required before canonical writes. Staging tables
   (`ingest_batches`, `ingest_raw_questions`, etc.) handle intermediate state.
