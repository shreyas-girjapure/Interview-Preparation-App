begin;

do $$
declare
  missing_count bigint;
begin
  select count(*)
  into missing_count
  from public.questions q
  where q.status = 'published'
    and not exists (
      select 1
      from public.question_topics qt
      where qt.question_id = q.id
    );

  if missing_count > 0 then
    raise exception
      'Cannot enforce published-question topic guardrail: % published question rows have no linked topics',
      missing_count;
  end if;
end
$$;

create or replace function public.assert_published_question_has_topics(
  target_question_id uuid
)
returns void
language plpgsql
as $$
declare
  question_status public.content_status;
  has_topics boolean;
begin
  select q.status
  into question_status
  from public.questions q
  where q.id = target_question_id;

  if question_status is null or question_status <> 'published' then
    return;
  end if;

  select exists (
    select 1
    from public.question_topics qt
    where qt.question_id = target_question_id
  )
  into has_topics;

  if has_topics then
    return;
  end if;

  raise exception using
    errcode = '23514',
    message = 'Published questions must have at least one linked topic.',
    detail = format(
      'question_id=%s has status=published but no rows in public.question_topics.',
      target_question_id
    ),
    hint = 'Insert at least one question_topics row before publishing, or set the question status away from published.';
end;
$$;

create or replace function public.enforce_published_questions_have_topics_from_questions()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_published_question_has_topics(new.id);
  return new;
end;
$$;

create or replace function public.enforce_published_questions_have_topics_from_question_topics()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_published_question_has_topics(old.question_id);

  if tg_op = 'UPDATE' and new.question_id is distinct from old.question_id then
    perform public.assert_published_question_has_topics(new.question_id);
  end if;

  return null;
end;
$$;

drop trigger if exists questions_require_topic_links_when_published
  on public.questions;

create constraint trigger questions_require_topic_links_when_published
after insert or update of status
on public.questions
deferrable initially deferred
for each row
when (new.status = 'published')
execute function public.enforce_published_questions_have_topics_from_questions();

drop trigger if exists question_topics_preserve_published_question_links
  on public.question_topics;

create constraint trigger question_topics_preserve_published_question_links
after delete or update of question_id
on public.question_topics
deferrable initially deferred
for each row
execute function public.enforce_published_questions_have_topics_from_question_topics();

commit;
