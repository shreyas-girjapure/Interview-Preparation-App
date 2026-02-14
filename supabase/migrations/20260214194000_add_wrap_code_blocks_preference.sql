begin;

alter table public.user_preferences
  add column if not exists wrap_code_blocks_on_mobile boolean not null default false;

commit;
