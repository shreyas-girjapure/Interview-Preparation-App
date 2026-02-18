begin;

with role_playlist as (
  select id
  from public.playlists
  where slug = 'role-salesforce-core'
  limit 1
),
role_questions as (
  select
    q.id,
    row_number() over (
      order by
        q.published_at desc nulls last,
        q.created_at desc,
        q.id
    ) as sort_order
  from public.questions q
  where q.status = 'published'
  order by
    q.published_at desc nulls last,
    q.created_at desc,
    q.id
  limit 8
)
insert into public.playlist_items (playlist_id, question_id, sort_order)
select rp.id, rq.id, rq.sort_order
from role_playlist rp
cross join role_questions rq
on conflict (playlist_id, question_id) do update
set sort_order = excluded.sort_order;

with company_playlist as (
  select id
  from public.playlists
  where slug = 'company-enterprise-screening-pack'
  limit 1
),
company_candidates as (
  select
    q.id,
    1 as priority,
    q.published_at,
    q.created_at
  from public.questions q
  where q.status = 'published'
    and coalesce(q.seniority_level, '') in ('mid', 'senior', 'lead', 'architect')

  union all

  select
    q.id,
    2 as priority,
    q.published_at,
    q.created_at
  from public.questions q
  where q.status = 'published'
),
company_deduped as (
  select distinct on (candidate.id)
    candidate.id,
    candidate.priority,
    candidate.published_at,
    candidate.created_at
  from company_candidates candidate
  order by candidate.id, candidate.priority
),
company_questions as (
  select
    candidate.id,
    row_number() over (
      order by
        candidate.priority,
        candidate.published_at desc nulls last,
        candidate.created_at desc,
        candidate.id
    ) as sort_order
  from company_deduped candidate
  order by
    candidate.priority,
    candidate.published_at desc nulls last,
    candidate.created_at desc,
    candidate.id
  limit 8
)
insert into public.playlist_items (playlist_id, question_id, sort_order)
select cp.id, cq.id, cq.sort_order
from company_playlist cp
cross join company_questions cq
on conflict (playlist_id, question_id) do update
set sort_order = excluded.sort_order;

with custom_playlist as (
  select id
  from public.playlists
  where slug = 'custom-mixed-practice-set'
  limit 1
),
custom_questions as (
  select
    q.id,
    row_number() over (
      order by
        lower(q.title),
        q.id
    ) as sort_order
  from public.questions q
  where q.status = 'published'
  order by
    lower(q.title),
    q.id
  limit 8
)
insert into public.playlist_items (playlist_id, question_id, sort_order)
select cp.id, cq.id, cq.sort_order
from custom_playlist cp
cross join custom_questions cq
on conflict (playlist_id, question_id) do update
set sort_order = excluded.sort_order;

commit;
