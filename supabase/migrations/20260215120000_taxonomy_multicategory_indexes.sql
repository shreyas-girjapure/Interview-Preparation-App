begin;

alter table public.categories
  add column if not exists is_active boolean not null default true;

create index if not exists categories_active_sort_name_idx
  on public.categories (is_active, sort_order, name);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'topics'
      and column_name = 'legacy_category_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'topics'
      and column_name = 'preparation_category_id'
  ) then
    alter table public.topics
      rename column legacy_category_id to preparation_category_id;
  end if;
end
$$;

alter table public.topics
  add column if not exists preparation_category_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'topics'
      and column_name = 'legacy_category_id'
  ) then
    execute
      'update public.topics
       set preparation_category_id = coalesce(preparation_category_id, legacy_category_id)';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.topics'::regclass
      and contype = 'f'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.topics'::regclass
            and attname = 'preparation_category_id'
            and not attisdropped
        )
      ]::smallint[]
  ) then
    alter table public.topics
      add constraint topics_preparation_category_id_fkey
      foreign key (preparation_category_id)
      references public.categories (id)
      on delete restrict;
  end if;
end
$$;

do $$
declare
  missing_count bigint;
begin
  select count(*)
  into missing_count
  from public.topics
  where preparation_category_id is null;

  if missing_count > 0 then
    raise exception
      'Cannot enforce topics.preparation_category_id: % topic rows have NULL category',
      missing_count;
  end if;
end
$$;

alter table public.topics
  alter column preparation_category_id set not null;

create unique index if not exists topics_category_name_unique_idx
  on public.topics (preparation_category_id, lower(name));

create index if not exists topics_category_status_sort_name_idx
  on public.topics (preparation_category_id, status, sort_order, name);

create index if not exists topics_published_category_sort_idx
  on public.topics (preparation_category_id, sort_order, id)
  where status = 'published';

drop index if exists public.question_topics_primary_per_question_idx;

alter table public.question_topics
  drop column if exists is_primary;

create index if not exists question_topics_question_sort_idx
  on public.question_topics (question_id, sort_order, topic_id);

drop index if exists public.questions_primary_topic_idx;

alter table public.questions
  drop column if exists primary_topic_id;

drop index if exists public.questions_category_status_idx;
drop index if exists public.questions_difficulty_idx;
drop index if exists public.questions_status_idx;

alter table public.questions
  drop column if exists category_id;

create index if not exists questions_published_order_idx
  on public.questions (published_at desc, id)
  where status = 'published';

create index if not exists questions_difficulty_status_published_idx
  on public.questions (difficulty, status, published_at desc);

create index if not exists questions_title_lower_idx
  on public.questions (lower(title));

create index if not exists questions_tags_gin_idx
  on public.questions
  using gin (tags);

create index if not exists answers_published_question_order_idx
  on public.answers (question_id, published_at desc, created_at desc)
  where status = 'published';

commit;
