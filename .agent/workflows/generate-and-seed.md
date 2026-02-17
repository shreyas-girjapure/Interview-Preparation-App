---
description: Generate questions for given topics, then generate answers and seed DB. Agent handles question generation, dedup, answer generation, and migration SQL.
---

# Generate and Seed

User provides topic names. Agent generates questions, answers, and a complete idempotent migration file.

## User Input Format

The user provides one or more topic names. Optionally, specify subcategory/category if they are new:

```
Topics:
- Apex Triggers
- Governor Limits
- LWC Communication (subcategory: Lightning Web Components)
```

If no subcategory/category is given, the agent maps the topic to an existing subcategory from the canonical list in `content/templates/subcategory-seed.md`.

## Steps

### Step 1: Resolve Catalog Chain

For each topic name:

1. Determine the `category` (currently `salesforce` for all Salesforce topics)
2. Determine the `subcategory` by matching the topic to the canonical subcategory list
3. Generate `slug` from the topic name (kebab-case)
4. Generate a `short_description` (one line) for new topics

Present the resolved mapping to the user for confirmation.

### Step 2: Fetch Existing Catalog from DB

Run the helper script to get the current catalog (categories, subcategories, topics, questions) as JSON:

```bash
node scripts/fetch-existing-catalog.mjs > catalog.json
```

### Step 3: Catalog Dedup Check

Using `content/templates/catalog-dedup-check.md`:

1. Build `{PROPOSED_ITEMS_JSON}` from the topics/subcategories/categories from Step 1
2. Build existing catalog JSON from Step 2
3. Run the dedup check
4. **Gate**: Only `create_new` or `update_existing` items proceed

### Step 4: Generate Topic Overviews (New Topics Only)

For topics classified as `create_new`, use `content/templates/topic-seed.md`:

- `{TOPIC_NAME}` — Topic name
- `{TOPIC_SLUG}` — Topic slug
- `{SUBCATEGORY}` — Parent subcategory
- `{SHORT_DESCRIPTION}` — From Step 1

### Step 5: Generate Questions

Use `content/templates/question-generation.md` for each topic. This generates 6 questions per topic:

- 3 standard (1 junior, 1 mid, 1 senior)
- 2 scenario (1 senior, 1 architect)
- 1 code_review (1 mid or senior)

Input variables:

- `{TOPIC}` — Topic name
- `{SUBCATEGORY}` — Subcategory name
- `{CATEGORY}` — Category name

### Step 6: Question Dedup Check

Compare every generated question against existing questions from Step 2:

- **Exact slug match** → Drop the question
- **Fuzzy title match** (normalized: lowercase, trim, collapse spaces) → Warn user
- **No match** → Keep

If duplicates are dropped, note them in the output. Do NOT regenerate replacements unless the user asks — partial batches are fine.

### Step 7: Generate Answers

For each question that passed dedup, generate an answer using the matching template:

| `question_type` | Template                                  |
| --------------- | ----------------------------------------- |
| `standard`      | `content/templates/standard-answer.md`    |
| `scenario`      | `content/templates/scenario-answer.md`    |
| `code_review`   | `content/templates/code-review-answer.md` |

Input variables:

- `{QUESTION_TITLE}` — The question title
- `{TOPIC}` — The topic name
- `{SUBCATEGORY}` — The subcategory name

### Step 8: Build Migration SQL

Create a single migration file following the exact pattern from `supabase/migrations/20260216150000_seed_salesforce_content.sql`:

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
on conflict (slug) do update set ...;

-- PART 3: Topics
insert into public.topics (slug, name, short_description, overview_markdown, status, published_at, sort_order, subcategory_id)
select ... from ... join public.subcategories s on s.slug = '...'
on conflict (slug) do update set ...;

-- PART 4: Questions + question_topics
insert into public.questions (slug, title, summary, question_type, seniority_level, status, published_at)
select ...
on conflict (slug) do update set ...;

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

### Step 9: Write Migration File

Save as:

```
supabase/migrations/YYYYMMDDHHMMSS_seed_<batch_name>.sql
```

Use current UTC timestamp and a descriptive batch name (e.g., `seed_apex_testing_questions`).

// turbo

### Step 10: Push to DB

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

### Step 11: Verify

// turbo

```bash
node scripts/smoke-published-question-topic-guardrail.mjs
```

## Important Rules

1. **Always present the resolved catalog mapping (Step 1) and dedup results (Steps 3, 6) to the user before generating content**
2. **Dollar-quote all markdown content** in SQL using `$$...$$` to avoid escaping issues
3. **Every INSERT must use `ON CONFLICT ... DO UPDATE`** (or `DO NOTHING` for answers) for idempotency
4. **Questions must link to at least one topic** via `question_topics` — the DB guardrail enforces this for published questions
5. **Set status to `'published'`** and `published_at` for all content
6. **Follow the exact SQL patterns** from `supabase/migrations/20260216150000_seed_salesforce_content.sql`
7. **6 questions per topic** — follow the distribution in `question-generation.md`
8. **Partial batches are OK** — if some questions are dupes, seed the rest
