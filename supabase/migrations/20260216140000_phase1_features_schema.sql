begin;

-- =============================================================================
-- Phase 1 Feature Schema
-- Subcategories, Question Types, Seniority, Spaced Repetition, Playlists
-- =============================================================================

-- -------------------------------------------------------
-- 1.0  Subcategories (topic grouping within a category)
-- -------------------------------------------------------
-- Hierarchy: categories → subcategories → topics → questions
-- Clean-slate: drop old column, create fresh structure

-- Drop old FK, indexes, and column
alter table public.topics
  drop constraint if exists topics_preparation_category_id_fkey;

drop index if exists topics_category_name_lower_idx;
drop index if exists topics_category_status_sort_idx;
drop index if exists topics_category_sort_paged_idx;

alter table public.topics
  drop column if exists preparation_category_id;

-- Create subcategories table
create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) >= 2 and char_length(name) <= 200),
  description text check (description is null or char_length(trim(description)) >= 1),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (category_id, name)  -- no duplicate names within a category
);

create index if not exists subcategories_category_sort_idx
  on public.subcategories (category_id, sort_order, name);

-- Add subcategory_id to topics (nullable until seed data populates it)
alter table public.topics
  add column if not exists subcategory_id uuid
  references public.subcategories (id) on delete cascade;

create index if not exists topics_subcategory_name_idx
  on public.topics (subcategory_id, lower(name));

create index if not exists topics_subcategory_status_sort_idx
  on public.topics (subcategory_id, status, sort_order, name);

create index if not exists topics_subcategory_sort_paged_idx
  on public.topics (subcategory_id, sort_order, id)
  where status = 'published';

-- Trigger: auto-set updated_at
drop trigger if exists subcategories_set_updated_at on public.subcategories;
create trigger subcategories_set_updated_at
before update on public.subcategories
for each row
execute function public.trigger_set_updated_at();

-- Grants
grant select on public.subcategories to anon;
grant select, insert, update, delete on public.subcategories to authenticated;

-- RLS
alter table public.subcategories enable row level security;

drop policy if exists subcategories_select_policy on public.subcategories;
create policy subcategories_select_policy
on public.subcategories
for select
using (
  is_active = true
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists subcategories_manage_policy on public.subcategories;
create policy subcategories_manage_policy
on public.subcategories
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

-- -------------------------------------------------------
-- 1.1  Question type (standard | scenario | code_review)
-- -------------------------------------------------------

alter table public.questions
  add column if not exists question_type text not null default 'standard'
    check (question_type in ('standard', 'scenario', 'code_review'));

create index if not exists questions_type_status_idx
  on public.questions (question_type, status, published_at desc);

-- -------------------------------------------------------
-- 1.2  Seniority level on questions
-- -------------------------------------------------------

alter table public.questions
  add column if not exists seniority_level text
    check (seniority_level in ('junior', 'mid', 'senior', 'lead', 'architect'));

create index if not exists questions_seniority_status_idx
  on public.questions (seniority_level, status, published_at desc)
  where seniority_level is not null;

-- -------------------------------------------------------
-- 1.3  Spaced repetition columns on progress tables
-- -------------------------------------------------------

alter table public.user_question_progress
  add column if not exists review_status text
    check (review_status in ('got_it', 'review_later')),
  add column if not exists next_review_at timestamptz,
  add column if not exists review_count smallint not null default 0
    check (review_count >= 0),
  add column if not exists ease_factor real not null default 2.5
    check (ease_factor >= 1.0 and ease_factor <= 5.0);

alter table public.user_topic_progress
  add column if not exists review_status text
    check (review_status in ('got_it', 'review_later')),
  add column if not exists next_review_at timestamptz,
  add column if not exists review_count smallint not null default 0
    check (review_count >= 0),
  add column if not exists ease_factor real not null default 2.5
    check (ease_factor >= 1.0 and ease_factor <= 5.0);

create index if not exists uqp_review_due_idx
  on public.user_question_progress (user_id, next_review_at)
  where review_status = 'review_later' and next_review_at is not null;

create index if not exists utp_review_due_idx
  on public.user_topic_progress (user_id, next_review_at)
  where review_status = 'review_later' and next_review_at is not null;

-- -------------------------------------------------------
-- 1.4  Playlists
-- -------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'playlist_type') then
    create type public.playlist_type as enum ('role', 'company', 'custom');
  end if;

  if not exists (select 1 from pg_type where typname = 'playlist_access') then
    create type public.playlist_access as enum ('free', 'preview', 'paid');
  end if;
end
$$;

-- Playlists: named, ordered collections of questions
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) >= 3 and char_length(title) <= 300),
  description text check (description is null or char_length(trim(description)) >= 1),
  playlist_type public.playlist_type not null,
  access_level public.playlist_access not null default 'free',
  cover_image_url text check (cover_image_url is null or cover_image_url ~ '^https?://'),
  preview_count smallint not null default 3 check (preview_count between 0 and 50),
  sort_order integer not null default 0 check (sort_order >= 0),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- published playlists must have a published_at timestamp
  check (status <> 'published' or published_at is not null)
);

create index if not exists playlists_type_status_idx
  on public.playlists (playlist_type, status, published_at desc);

create index if not exists playlists_sort_order_idx
  on public.playlists (sort_order, title);

-- Playlist items: ordered list of questions in a playlist
create table if not exists public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (playlist_id, question_id)
);

create index if not exists playlist_items_playlist_sort_idx
  on public.playlist_items (playlist_id, sort_order, question_id);

-- User progress on playlists
create table if not exists public.user_playlist_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  items_read smallint not null default 0 check (items_read >= 0),
  last_item_id uuid references public.playlist_items (id) on delete set null,
  started_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, playlist_id)
);

create index if not exists user_playlist_progress_user_idx
  on public.user_playlist_progress (user_id, updated_at desc);

-- -------------------------------------------------------
-- Triggers: auto-set updated_at
-- -------------------------------------------------------

drop trigger if exists playlists_set_updated_at on public.playlists;
create trigger playlists_set_updated_at
before update on public.playlists
for each row
execute function public.trigger_set_updated_at();

drop trigger if exists user_playlist_progress_set_updated_at on public.user_playlist_progress;
create trigger user_playlist_progress_set_updated_at
before update on public.user_playlist_progress
for each row
execute function public.trigger_set_updated_at();

-- -------------------------------------------------------
-- Grants
-- -------------------------------------------------------

grant select on public.playlists, public.playlist_items to anon;

grant select, insert, update, delete on public.playlists to authenticated;
grant select, insert, update, delete on public.playlist_items to authenticated;
grant select, insert, update, delete on public.user_playlist_progress to authenticated;

-- -------------------------------------------------------
-- RLS
-- -------------------------------------------------------

alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.user_playlist_progress enable row level security;

-- Playlists: published visible to all, admin/editor manage all
drop policy if exists playlists_select_policy on public.playlists;
create policy playlists_select_policy
on public.playlists
for select
using (
  status = 'published'
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists playlists_manage_policy on public.playlists;
create policy playlists_manage_policy
on public.playlists
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

-- Playlist items: visible when parent playlist is published
drop policy if exists playlist_items_select_policy on public.playlist_items;
create policy playlist_items_select_policy
on public.playlist_items
for select
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.status = 'published'
  )
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists playlist_items_manage_policy on public.playlist_items;
create policy playlist_items_manage_policy
on public.playlist_items
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

-- User playlist progress: owner-only access
drop policy if exists user_playlist_progress_select_policy on public.user_playlist_progress;
create policy user_playlist_progress_select_policy
on public.user_playlist_progress
for select
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_playlist_progress_insert_policy on public.user_playlist_progress;
create policy user_playlist_progress_insert_policy
on public.user_playlist_progress
for insert
with check (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_playlist_progress_update_policy on public.user_playlist_progress;
create policy user_playlist_progress_update_policy
on public.user_playlist_progress
for update
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_playlist_progress_delete_policy on public.user_playlist_progress;
create policy user_playlist_progress_delete_policy
on public.user_playlist_progress
for delete
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

-- -------------------------------------------------------
-- Data integrity rules (existing tables hardening)
-- -------------------------------------------------------

-- Categories: prevent empty names, enforce sort_order >= 0
alter table public.categories
  add constraint categories_name_not_empty
    check (char_length(trim(name)) >= 2);

alter table public.categories
  add constraint categories_sort_order_non_negative
    check (sort_order >= 0);

alter table public.categories
  add column if not exists is_active boolean not null default true;

-- Topics: prevent empty names, enforce sort_order >= 0
alter table public.topics
  add constraint topics_name_length
    check (char_length(trim(name)) >= 2 and char_length(name) <= 200);

alter table public.topics
  add constraint topics_short_desc_not_empty
    check (char_length(trim(short_description)) >= 1);

alter table public.topics
  add constraint topics_sort_order_non_negative
    check (sort_order >= 0);

-- Questions: prevent empty titles
alter table public.questions
  add constraint questions_title_length
    check (char_length(trim(title)) >= 5 and char_length(title) <= 500);

alter table public.questions
  add constraint questions_summary_not_empty
    check (char_length(trim(summary)) >= 1);

-- published content must have published_at
alter table public.questions
  add constraint questions_published_at_required
    check (status <> 'published' or published_at is not null);

alter table public.topics
  add constraint topics_published_at_required
    check (status <> 'published' or published_at is not null);

-- Answers: content must not be empty
alter table public.answers
  add constraint answers_content_not_empty
    check (char_length(trim(content_markdown)) >= 10);

alter table public.answers
  add constraint answers_published_at_required
    check (status <> 'published' or published_at is not null);

-- Question topics: sort_order >= 0
alter table public.question_topics
  add constraint qt_sort_order_non_negative
    check (sort_order >= 0);

-- Topic edges: sort_order >= 0
alter table public.topic_edges
  add constraint te_sort_order_non_negative
    check (sort_order >= 0);

commit;
