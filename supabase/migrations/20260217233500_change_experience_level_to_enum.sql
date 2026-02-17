begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'experience_level') then
    create type public.experience_level as enum (
      'junior',
      'mid',
      'senior',
      'lead',
      'architect'
    );
  end if;
end
$$;

do $$
declare
  column_udt_name text;
begin
  select columns.udt_name
    into column_udt_name
  from information_schema.columns as columns
  where columns.table_schema = 'public'
    and columns.table_name = 'user_preferences'
    and columns.column_name = 'experience_level';

  if column_udt_name is null then
    return;
  end if;

  if column_udt_name <> 'experience_level' then
    alter table public.user_preferences
      alter column experience_level type public.experience_level
      using (
        case
          when experience_level is null then null
          when nullif(btrim(experience_level), '') is null then null
          when lower(btrim(experience_level)) in ('junior', 'mid', 'senior', 'lead', 'architect')
            then lower(btrim(experience_level))::public.experience_level
          when lower(btrim(experience_level)) ~ '^[0-9]+(\s*(\+|years?|yrs?))?$'
            then (
              case
                when regexp_replace(lower(btrim(experience_level)), '[^0-9]', '', 'g')::integer <= 1
                  then 'junior'
                when regexp_replace(lower(btrim(experience_level)), '[^0-9]', '', 'g')::integer <= 4
                  then 'mid'
                when regexp_replace(lower(btrim(experience_level)), '[^0-9]', '', 'g')::integer <= 7
                  then 'senior'
                when regexp_replace(lower(btrim(experience_level)), '[^0-9]', '', 'g')::integer <= 10
                  then 'lead'
                else 'architect'
              end
            )::public.experience_level
          when lower(btrim(experience_level)) in ('entry', 'entry-level', 'entry level', 'beginner', 'intern')
            then 'junior'::public.experience_level
          when lower(btrim(experience_level)) in ('intermediate', 'mid-level', 'mid level')
            then 'mid'::public.experience_level
          when lower(btrim(experience_level)) in ('advanced', 'staff', 'principal')
            then 'senior'::public.experience_level
          else null
        end
      );
  end if;
end
$$;

commit;
