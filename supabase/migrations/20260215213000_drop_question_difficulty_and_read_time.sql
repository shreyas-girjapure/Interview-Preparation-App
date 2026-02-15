begin;

drop index if exists public.questions_difficulty_status_published_idx;
drop index if exists public.questions_difficulty_idx;

alter table public.questions
  drop column if exists difficulty,
  drop column if exists estimated_minutes;

commit;
