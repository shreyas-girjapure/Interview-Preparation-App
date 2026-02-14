begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'topic_relation_type') then
    create type public.topic_relation_type as enum ('related', 'prerequisite', 'deep_dive');
  end if;
end
$$;

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique,
  short_description text not null,
  overview_markdown text not null default '',
  status public.content_status not null default 'draft',
  published_at timestamptz,
  sort_order integer not null default 0,
  legacy_category_id uuid references public.categories (id) on delete set null,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists topics_status_idx
  on public.topics (status, published_at desc);

create index if not exists topics_sort_order_idx
  on public.topics (sort_order, name);

create table if not exists public.question_topics (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (question_id, topic_id)
);

create unique index if not exists question_topics_primary_per_question_idx
  on public.question_topics (question_id)
  where is_primary;

create index if not exists question_topics_topic_idx
  on public.question_topics (topic_id, sort_order, question_id);

create table if not exists public.topic_edges (
  id uuid primary key default gen_random_uuid(),
  from_topic_id uuid not null references public.topics (id) on delete cascade,
  to_topic_id uuid not null references public.topics (id) on delete cascade,
  relation_type public.topic_relation_type not null default 'related',
  sort_order integer not null default 0,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint topic_edges_no_self_ref check (from_topic_id <> to_topic_id),
  unique (from_topic_id, to_topic_id, relation_type)
);

create index if not exists topic_edges_from_idx
  on public.topic_edges (from_topic_id, relation_type, sort_order);

create index if not exists topic_edges_to_idx
  on public.topic_edges (to_topic_id, relation_type);

create table if not exists public.user_question_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  is_read boolean not null default false,
  read_at timestamptz,
  completion_percent smallint not null default 0
    check (completion_percent between 0 and 100),
  last_viewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, question_id)
);

create index if not exists user_question_progress_user_idx
  on public.user_question_progress (user_id, updated_at desc);

create table if not exists public.user_topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  is_read boolean not null default false,
  read_at timestamptz,
  completion_percent smallint not null default 0
    check (completion_percent between 0 and 100),
  last_viewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, topic_id)
);

create index if not exists user_topic_progress_user_idx
  on public.user_topic_progress (user_id, updated_at desc);

alter table public.questions
  add column if not exists primary_topic_id uuid references public.topics (id) on delete set null;

create index if not exists questions_primary_topic_idx
  on public.questions (primary_topic_id, status, published_at desc);

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at
before update on public.topics
for each row
execute function public.trigger_set_updated_at();

drop trigger if exists question_topics_set_updated_at on public.question_topics;
create trigger question_topics_set_updated_at
before update on public.question_topics
for each row
execute function public.trigger_set_updated_at();

drop trigger if exists topic_edges_set_updated_at on public.topic_edges;
create trigger topic_edges_set_updated_at
before update on public.topic_edges
for each row
execute function public.trigger_set_updated_at();

drop trigger if exists user_question_progress_set_updated_at on public.user_question_progress;
create trigger user_question_progress_set_updated_at
before update on public.user_question_progress
for each row
execute function public.trigger_set_updated_at();

drop trigger if exists user_topic_progress_set_updated_at on public.user_topic_progress;
create trigger user_topic_progress_set_updated_at
before update on public.user_topic_progress
for each row
execute function public.trigger_set_updated_at();

grant select on public.topics, public.question_topics, public.topic_edges to anon;

grant select, insert, update, delete on public.topics to authenticated;
grant select, insert, update, delete on public.question_topics to authenticated;
grant select, insert, update, delete on public.topic_edges to authenticated;
grant select, insert, update, delete on public.user_question_progress to authenticated;
grant select, insert, update, delete on public.user_topic_progress to authenticated;

alter table public.topics enable row level security;
alter table public.question_topics enable row level security;
alter table public.topic_edges enable row level security;
alter table public.user_question_progress enable row level security;
alter table public.user_topic_progress enable row level security;

drop policy if exists topics_select_policy on public.topics;
create policy topics_select_policy
on public.topics
for select
using (
  status = 'published'
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists topics_manage_policy on public.topics;
create policy topics_manage_policy
on public.topics
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists question_topics_select_policy on public.question_topics;
create policy question_topics_select_policy
on public.question_topics
for select
using (
  (
    exists (
      select 1
      from public.questions q
      where q.id = question_id
        and q.status = 'published'
    )
    and exists (
      select 1
      from public.topics t
      where t.id = topic_id
        and t.status = 'published'
    )
  )
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists question_topics_manage_policy on public.question_topics;
create policy question_topics_manage_policy
on public.question_topics
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists topic_edges_select_policy on public.topic_edges;
create policy topic_edges_select_policy
on public.topic_edges
for select
using (
  (
    exists (
      select 1
      from public.topics source
      where source.id = from_topic_id
        and source.status = 'published'
    )
    and exists (
      select 1
      from public.topics destination
      where destination.id = to_topic_id
        and destination.status = 'published'
    )
  )
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists topic_edges_manage_policy on public.topic_edges;
create policy topic_edges_manage_policy
on public.topic_edges
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_question_progress_select_policy on public.user_question_progress;
create policy user_question_progress_select_policy
on public.user_question_progress
for select
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_question_progress_insert_policy on public.user_question_progress;
create policy user_question_progress_insert_policy
on public.user_question_progress
for insert
with check (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_question_progress_update_policy on public.user_question_progress;
create policy user_question_progress_update_policy
on public.user_question_progress
for update
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_question_progress_delete_policy on public.user_question_progress;
create policy user_question_progress_delete_policy
on public.user_question_progress
for delete
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_topic_progress_select_policy on public.user_topic_progress;
create policy user_topic_progress_select_policy
on public.user_topic_progress
for select
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_topic_progress_insert_policy on public.user_topic_progress;
create policy user_topic_progress_insert_policy
on public.user_topic_progress
for insert
with check (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_topic_progress_update_policy on public.user_topic_progress;
create policy user_topic_progress_update_policy
on public.user_topic_progress
for update
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists user_topic_progress_delete_policy on public.user_topic_progress;
create policy user_topic_progress_delete_policy
on public.user_topic_progress
for delete
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

commit;
