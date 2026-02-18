begin;

with seed_playlists as (
  select *
  from (
    values
      (
        'role-salesforce-core',
        'Salesforce Core Role Prep',
        'Foundational published questions ordered for first-pass role interview prep.',
        'role'::public.playlist_type,
        'free'::public.playlist_access,
        'published'::public.content_status,
        3::smallint,
        10::integer
      ),
      (
        'company-enterprise-screening-pack',
        'Enterprise Screening Pack',
        'A tighter set for company-style screening rounds with practical depth.',
        'company'::public.playlist_type,
        'preview'::public.playlist_access,
        'published'::public.content_status,
        4::smallint,
        20::integer
      ),
      (
        'custom-mixed-practice-set',
        'Mixed Practice Set',
        'Alphabetically varied published questions for custom revision sessions.',
        'custom'::public.playlist_type,
        'free'::public.playlist_access,
        'published'::public.content_status,
        5::smallint,
        30::integer
      )
  ) as seed(
    slug,
    title,
    description,
    playlist_type,
    access_level,
    status,
    preview_count,
    sort_order
  )
),
upsert_playlists as (
  insert into public.playlists (
    slug,
    title,
    description,
    playlist_type,
    access_level,
    status,
    preview_count,
    sort_order,
    published_at
  )
  select
    seed.slug,
    seed.title,
    seed.description,
    seed.playlist_type,
    seed.access_level,
    seed.status,
    seed.preview_count,
    seed.sort_order,
    timezone('utc', now())
  from seed_playlists seed
  on conflict (slug) do update
  set
    title = excluded.title,
    description = excluded.description,
    playlist_type = excluded.playlist_type,
    access_level = excluded.access_level,
    status = excluded.status,
    preview_count = excluded.preview_count,
    sort_order = excluded.sort_order,
    published_at = case
      when excluded.status = 'published'
        then coalesce(public.playlists.published_at, excluded.published_at)
      else null
    end
  returning id, slug
),
resolved_playlists as (
  select playlist.id, playlist.slug
  from public.playlists playlist
  join seed_playlists seed on seed.slug = playlist.slug
),
recent_questions as (
  select
    question.id,
    row_number() over (
      order by
        question.published_at desc nulls last,
        question.created_at desc,
        question.id
    ) as sort_order
  from public.questions question
  where question.status = 'published'
),
seniority_questions as (
  select
    question.id,
    row_number() over (
      order by
        question.published_at desc nulls last,
        question.created_at desc,
        question.id
    ) as sort_order
  from public.questions question
  where question.status = 'published'
    and coalesce(question.seniority_level, '') in ('mid', 'senior', 'lead', 'architect')
),
seniority_or_recent_questions as (
  select id, sort_order
  from seniority_questions
  where sort_order <= 8
  union all
  select id, sort_order
  from recent_questions
  where sort_order <= 8
    and not exists (select 1 from seniority_questions)
),
alphabetical_questions as (
  select
    question.id,
    row_number() over (
      order by
        lower(question.title),
        question.id
    ) as sort_order
  from public.questions question
  where question.status = 'published'
),
seed_items as (
  select playlist.id as playlist_id, question.id as question_id, question.sort_order
  from resolved_playlists playlist
  join recent_questions question
    on playlist.slug = 'role-salesforce-core'
   and question.sort_order <= 8

  union all

  select playlist.id as playlist_id, question.id as question_id, question.sort_order
  from resolved_playlists playlist
  join seniority_or_recent_questions question
    on playlist.slug = 'company-enterprise-screening-pack'
   and question.sort_order <= 8

  union all

  select playlist.id as playlist_id, question.id as question_id, question.sort_order
  from resolved_playlists playlist
  join alphabetical_questions question
    on playlist.slug = 'custom-mixed-practice-set'
   and question.sort_order <= 8
)
insert into public.playlist_items (playlist_id, question_id, sort_order)
select
  item.playlist_id,
  item.question_id,
  item.sort_order
from seed_items item
on conflict (playlist_id, question_id) do update
set sort_order = excluded.sort_order;

commit;
