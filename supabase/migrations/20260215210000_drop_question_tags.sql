begin;

drop index if exists public.questions_tags_gin_idx;

alter table public.questions
  drop column if exists tags;

commit;
