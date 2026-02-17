---
description: Seed DB from user-provided questions (title + type). Agent infers topic/subcategory/slug, generates answers, produces migration SQL.
---

# Seed From Questions

User provides questions (title + question_type). Agent resolves the full catalog chain, generates answers, and produces an idempotent migration file.

## User Input Format

The user provides questions as a simple list. Each item needs only:

- **title** — The interview question text
- **question_type** — `standard` | `scenario` | `code_review`

Example:

```
1. "Explain the trigger context variables in Apex and when you would use each one" — standard
2. "Design a trigger framework for an org with 20+ custom objects" — scenario
3. "Review this Apex trigger and identify issues" — code_review
```

## Steps

### Step 1: Classify & Structure Questions

For each question the user provides, infer:

| Field             | How to Infer                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `slug`            | Derive from title: kebab-case, max 60 chars, NO seniority suffix (e.g., `apex-triggers-context-variables`)                                                         |
| `seniority_level` | Infer from question complexity: fundamental concepts → `junior`, practical patterns → `mid`, architecture/design → `senior`, enterprise-scale → `lead`/`architect` |
| `topic`           | Identify the primary Salesforce topic from the question subject matter                                                                                             |
| `subcategory`     | Map topic to its parent subcategory (see `content/templates/subcategory-seed.md` for the canonical list)                                                           |
| `category`        | Currently always `salesforce`                                                                                                                                      |
| `summary`         | One sentence describing what the question tests                                                                                                                    |

Present the classified table to the user for confirmation before proceeding.

### Step 2: Fetch Existing Catalog from DB

Run the helper script to get the current catalog (categories, subcategories, topics, questions) as JSON:

```bash
node scripts/fetch-existing-catalog.mjs > catalog.json
```

### Step 3: Catalog Dedup Check

Using the template in `content/templates/catalog-dedup-check.md`:

1. Build `{PROPOSED_ITEMS_JSON}` from the inferred categories, subcategories, and topics
2. Build `{EXISTING_CATEGORIES_JSON}`, `{EXISTING_SUBCATEGORIES_JSON}`, `{EXISTING_TOPICS_JSON}` from Step 2 results
3. Run the dedup check prompt
4. **Gate**: Only items classified as `create_new` or `update_existing` proceed. Skip `reuse_existing` items (they already exist). Halt on `reject_duplicate` or `reject_missing_parent`.

### Step 4: Question Dedup Check

Compare each proposed question against existing questions from Step 2:

- **Exact slug match** → Skip (already exists)
- **Fuzzy title match** (normalized: lowercase, trim, collapse spaces) → Warn user and ask whether to skip or keep
- **No match** → Proceed

Report the dedup results before continuing.

### Step 5: Generate Topic Overviews (New Topics Only)

For any topics marked `create_new` in Step 3, generate `overview_markdown` using the template at `content/templates/topic-seed.md`.

Input variables:

- `{TOPIC_NAME}` — Topic name
- `{TOPIC_SLUG}` — Topic slug
- `{SUBCATEGORY}` — Parent subcategory name
- `{SHORT_DESCRIPTION}` — One-line description (inferred in Step 1)

### Step 6: Generate Answers

For each question that passed dedup, generate an answer using the template that matches `question_type`:

| `question_type` | Template                                  |
| --------------- | ----------------------------------------- |
| `standard`      | `content/templates/standard-answer.md`    |
| `scenario`      | `content/templates/scenario-answer.md`    |
| `code_review`   | `content/templates/code-review-answer.md` |

Input variables for all templates:

- `{QUESTION_TITLE}` — The question title
- `{TOPIC}` — The topic name
- `{SUBCATEGORY}` — The subcategory name

### Step 7: Build Migration SQL

Create a single migration file with this exact structure (follow the pattern in `supabase/migrations/20260216150000_seed_salesforce_content.sql`):

```sql
begin;

-- PART 1: Categories (if any new)
insert into public.categories (slug, name, description, sort_order)
values (...)
on conflict (slug) do update
set name = excluded.name, description = excluded.description, ...;

-- PART 2: Subcategories (if any new)
insert into public.subcategories (slug, name, description, sort_order, category_id)
select ... from ... join public.categories c on c.slug = '...'
on conflict (slug) do update
set ...;

-- PART 3: Topics (if any new)
insert into public.topics (slug, name, short_description, overview_markdown, status, published_at, sort_order, subcategory_id)
select ... from ... join public.subcategories s on s.slug = '...'
on conflict (slug) do update
set ...;

-- PART 4: Questions + question_topics links
insert into public.questions (slug, title, summary, question_type, seniority_level, status, published_at)
select ...
on conflict (slug) do update
set ...;

insert into public.question_topics (question_id, topic_id, sort_order)
select q.id, t.id, seed.sort_order
from (...) as seed(question_slug, topic_slug, sort_order)
join public.questions q on q.slug = seed.question_slug
join public.topics t on t.slug = seed.topic_slug
on conflict (question_id, topic_id) do update
set sort_order = excluded.sort_order, updated_at = timezone('utc', now());

-- PART 5: Answers
insert into public.answers (question_id, title, content_markdown, is_primary, status, published_at)
select q.id, seed.title, seed.content_markdown, true, 'published'::public.content_status, timezone('utc', now())
from (...) as seed(question_slug, title, content_markdown)
join public.questions q on q.slug = seed.question_slug
on conflict do nothing;

commit;
```

### Step 8: Write Migration File

Save the SQL file with a timestamped name:

```
supabase/migrations/YYYYMMDDHHMMSS_seed_<batch_name>.sql
```

Use the current UTC timestamp (format: `YYYYMMDDHHMMSS`) and a descriptive batch name (e.g., `seed_apex_triggers_batch`).

// turbo

### Step 9: Push to DB

Link the project and push the pending migration (using `--include-all` if needed to resolve timestamp conflicts):

```bash
# Link project
export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d= -f2) && \
npx supabase link --project-ref $(grep SUPABASE_PROJECT_REF .env.local | cut -d= -f2) \
-p "$(grep SUPABASE_DB_PASSWORD .env.local | cut -d= -f2)"

# Push migrations
export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d= -f2) && \
npx supabase db push --include-all \
-p "$(grep SUPABASE_DB_PASSWORD .env.local | cut -d= -f2)"
```

### Step 10: Verify

// turbo

```bash
node scripts/smoke-published-question-topic-guardrail.mjs
```

## Important Rules

1. **Always present the classified question table (Step 1) and dedup results (Steps 3-4) to the user before generating content**
2. **Dollar-quote all markdown content** in SQL using `$$...$$` to avoid escaping issues
3. **Every INSERT must use `ON CONFLICT ... DO UPDATE`** (or `DO NOTHING` for answers) for idempotency
4. **Questions must link to at least one topic** via `question_topics` — the DB enforces this for published questions
5. **Set status to `'published'`** and `published_at` for all new content so it appears on the site immediately
6. **Follow the exact SQL patterns** from `supabase/migrations/20260216150000_seed_salesforce_content.sql`
