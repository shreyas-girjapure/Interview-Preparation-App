begin;

insert into public.topics (
  slug,
  name,
  short_description,
  overview_markdown,
  status,
  published_at,
  sort_order,
  legacy_category_id,
  created_at,
  updated_at
)
select
  c.slug,
  c.name,
  coalesce(
    nullif(trim(c.description), ''),
    c.name || ' interview topic.'
  ) as short_description,
  coalesce(
    nullif(trim(c.description), ''),
    '# ' || c.name || E'\n\nTopic overview is being prepared.'
  ) as overview_markdown,
  'published'::public.content_status as status,
  timezone('utc', now()) as published_at,
  c.sort_order,
  c.id,
  c.created_at,
  c.updated_at
from public.categories c
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  sort_order = excluded.sort_order,
  legacy_category_id = excluded.legacy_category_id,
  updated_at = timezone('utc', now());

insert into public.question_topics (
  question_id,
  topic_id,
  is_primary,
  sort_order
)
select
  q.id,
  t.id,
  false as is_primary,
  0 as sort_order
from public.questions q
join public.topics t on t.legacy_category_id = q.category_id
on conflict (question_id, topic_id) do nothing;

update public.question_topics qt
set
  is_primary = true,
  updated_at = timezone('utc', now())
from public.questions q
join public.topics t on t.legacy_category_id = q.category_id
where
  qt.question_id = q.id
  and qt.topic_id = t.id
  and not exists (
    select 1
    from public.question_topics existing
    where existing.question_id = qt.question_id
      and existing.is_primary = true
      and existing.id <> qt.id
  );

update public.questions q
set
  primary_topic_id = qt.topic_id,
  updated_at = timezone('utc', now())
from public.question_topics qt
where
  qt.question_id = q.id
  and qt.is_primary = true
  and (q.primary_topic_id is distinct from qt.topic_id);

commit;
