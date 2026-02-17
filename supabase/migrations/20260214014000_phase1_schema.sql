begin;

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'question_difficulty') then
    create type public.question_difficulty as enum ('easy', 'medium', 'hard');
  end if;

  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type public.content_status as enum ('draft', 'review', 'published');
  end if;

  if not exists (select 1 from pg_type where typname = 'attempt_state') then
    create type public.attempt_state as enum ('started', 'completed', 'needs_review');
  end if;

  if not exists (select 1 from pg_type where typname = 'content_entity_type') then
    create type public.content_entity_type as enum ('category', 'question', 'answer');
  end if;

  if not exists (select 1 from pg_type where typname = 'experience_level') then
    create type public.experience_level as enum ('junior', 'mid', 'senior', 'lead', 'architect');
  end if;
end
$$;

create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists users_role_idx on public.users (role);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  preferred_difficulty public.question_difficulty,
  focus_areas text[] not null default '{}',
  target_role text,
  experience_level public.experience_level,
  daily_goal_minutes integer check (
    daily_goal_minutes is null
    or daily_goal_minutes between 0 and 1440
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique,
  description text,
  sort_order integer not null default 0,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists categories_sort_order_idx on public.categories (sort_order, name);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  difficulty public.question_difficulty not null,
  summary text not null,
  tags text[] not null default '{}',
  estimated_minutes integer not null check (estimated_minutes > 0 and estimated_minutes <= 240),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists questions_category_status_idx on public.questions (category_id, status);
create index if not exists questions_difficulty_idx on public.questions (difficulty);
create index if not exists questions_status_idx on public.questions (status, published_at);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  title text,
  content_markdown text not null,
  is_primary boolean not null default false,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists answers_primary_per_question_idx
  on public.answers (question_id)
  where is_primary;

create index if not exists answers_question_status_idx on public.answers (question_id, status);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  attempt_state public.attempt_state not null default 'started',
  notes text,
  self_rating smallint check (self_rating between 1 and 5),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  attempted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists question_attempts_user_attempted_idx
  on public.question_attempts (user_id, attempted_at desc);

create index if not exists question_attempts_question_idx
  on public.question_attempts (question_id, attempted_at desc);

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type public.content_entity_type not null,
  entity_id uuid not null,
  revision_number integer not null check (revision_number > 0),
  snapshot jsonb not null,
  change_summary text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (entity_type, entity_id, revision_number)
);

create index if not exists content_revisions_lookup_idx
  on public.content_revisions (entity_type, entity_id, created_at desc);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.trigger_set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.trigger_set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.trigger_set_updated_at();

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
before update on public.questions
for each row
execute function public.trigger_set_updated_at();

drop trigger if exists answers_set_updated_at on public.answers;
create trigger answers_set_updated_at
before update on public.answers
for each row
execute function public.trigger_set_updated_at();

create or replace function public.has_any_role(required_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = any(required_roles)
  );
$$;

grant execute on function public.has_any_role(public.app_role[]) to anon, authenticated;

grant select on public.categories, public.questions, public.answers to anon;

grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.answers to authenticated;
grant select, insert, update, delete on public.question_attempts to authenticated;
grant select, insert, update, delete on public.content_revisions to authenticated;

alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.categories enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.question_attempts enable row level security;
alter table public.content_revisions enable row level security;

drop policy if exists users_select_policy on public.users;
create policy users_select_policy
on public.users
for select
using (
  id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role])
);

drop policy if exists users_insert_policy on public.users;
create policy users_insert_policy
on public.users
for insert
with check (
  id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role])
);

drop policy if exists users_update_policy on public.users;
create policy users_update_policy
on public.users
for update
using (
  id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role])
)
with check (
  id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role])
);

drop policy if exists users_delete_policy on public.users;
create policy users_delete_policy
on public.users
for delete
using (public.has_any_role(array['admin'::public.app_role]));

drop policy if exists user_preferences_select_policy on public.user_preferences;
create policy user_preferences_select_policy
on public.user_preferences
for select
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role])
);

drop policy if exists user_preferences_insert_policy on public.user_preferences;
create policy user_preferences_insert_policy
on public.user_preferences
for insert
with check (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role])
);

drop policy if exists user_preferences_update_policy on public.user_preferences;
create policy user_preferences_update_policy
on public.user_preferences
for update
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role])
)
with check (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role])
);

drop policy if exists user_preferences_delete_policy on public.user_preferences;
create policy user_preferences_delete_policy
on public.user_preferences
for delete
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role])
);

drop policy if exists categories_select_policy on public.categories;
create policy categories_select_policy
on public.categories
for select
using (true);

drop policy if exists categories_manage_policy on public.categories;
create policy categories_manage_policy
on public.categories
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists questions_select_policy on public.questions;
create policy questions_select_policy
on public.questions
for select
using (
  status = 'published'
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists questions_manage_policy on public.questions;
create policy questions_manage_policy
on public.questions
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists answers_select_policy on public.answers;
create policy answers_select_policy
on public.answers
for select
using (
  status = 'published'
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists answers_manage_policy on public.answers;
create policy answers_manage_policy
on public.answers
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists question_attempts_select_policy on public.question_attempts;
create policy question_attempts_select_policy
on public.question_attempts
for select
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists question_attempts_insert_policy on public.question_attempts;
create policy question_attempts_insert_policy
on public.question_attempts
for insert
with check (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists question_attempts_update_policy on public.question_attempts;
create policy question_attempts_update_policy
on public.question_attempts
for update
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists question_attempts_delete_policy on public.question_attempts;
create policy question_attempts_delete_policy
on public.question_attempts
for delete
using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists content_revisions_select_policy on public.content_revisions;
create policy content_revisions_select_policy
on public.content_revisions
for select
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

drop policy if exists content_revisions_manage_policy on public.content_revisions;
create policy content_revisions_manage_policy
on public.content_revisions
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

commit;
