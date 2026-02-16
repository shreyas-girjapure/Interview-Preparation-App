# Interview Preparation App - Project Tracking

Last updated: 2026-02-17

## Scope

- Build a topic-first interview prep app with readable question/answer pages.
- Use Supabase for auth + content storage + admin data operations.
- Keep content flow manual-first (draft → preview → publish), then add LLM-assisted ingestion.
- Support multiple question types (standard, scenario, code_review) and seniority levels.

## Current State

- Auth and account flows are live.
- Topic and question learner experiences are live.
- Admin composer is live at `/admin` with runtime preview and publish.
- 4-level content taxonomy live: Category → Subcategory → Topic → Question.
- Question types (`standard`, `scenario`, `code_review`) and seniority levels (`junior`–`architect`) in schema.
- Playlists schema is live (tables, RLS, triggers) — no UI yet.
- Spaced repetition columns added to progress tables — no UI yet.
- Salesforce content seeded: 7 subcategories, 4+ topics with structured overview markdown, 3 questions with answers.
- Legacy columns dropped: `tags`, `difficulty`, `estimated_minutes`, `preferred_difficulty`.
- Content generation templates created in `content/templates/` (8 templates covering topics, questions, answers, dedup).
- Pre-push git hook enforces `npm run ci` before every push.

## Delivered

| Area                      | Status     | Notes                                                    |
| ------------------------- | ---------- | -------------------------------------------------------- |
| Topic catalog             | ✅ Done    | Browse/search topics                                     |
| Topic overview page       | ✅ Done    | Markdown overview + related questions + related topics   |
| Question-to-topic linking | ✅ Done    | Many-to-many via `question_topics`                       |
| Code snippet readability  | ✅ Done    | Syntax-highlighted markdown code blocks                  |
| Structured answer format  | ✅ Done    | 3 answer templates (standard, scenario, code review)     |
| Admin composer            | ✅ Done    | Create topics + questions + answers with live preview    |
| Admin auth guard          | ✅ Done    | Role-based access via `requireAdminPageAccess`           |
| Content API               | ✅ Done    | Save draft + publish flow with Zod validation            |
| Publish workflow          | ✅ Done    | Draft → preview → publish                                |
| Bulk upsert               | ✅ Done    | Supabase CSV workflow + SQL seed migrations              |
| Deduplication controls    | ✅ Partial | Draft-time duplicate warnings in admin composer          |
| Taxonomy model            | ✅ Done    | Category → Subcategory → Topic hierarchy                 |
| Question-topic integrity  | ✅ Done    | Published questions require linked topics                |
| Query compatibility       | ✅ Done    | Queries derive categories through topic chain            |
| Topic relationships       | ✅ Partial | Question-topic links done; topic-edge management pending |

## Active Next

- Expand Salesforce content: more subcategories, topics, questions across all 7 subcategories.
- Playlist CRUD UI for admin.
- Spaced repetition UX for learners (review queue, review status buttons).
- Harden admin composer validations + error handling.

## Planned (Not Started)

- LLM ingestion staging schema + moderation queue tables/views.
- Promotion/audit workflow for approved staged content.
- Crawler ingestion with review gate.
- Multi-category expansion beyond Salesforce.

## Forward Plan

See `docs/ROADMAP.md` for the phased delivery plan.
