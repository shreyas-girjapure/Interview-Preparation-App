begin;

alter table public.user_preferences
  drop column if exists preferred_difficulty;

drop type if exists public.question_difficulty;

commit;
