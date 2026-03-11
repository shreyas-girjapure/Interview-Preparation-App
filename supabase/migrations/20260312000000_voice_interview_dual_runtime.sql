begin;

alter table "public"."interview_sessions"
    add column if not exists "runtime_kind" text,
    add column if not exists "runtime_profile_id" text,
    add column if not exists "runtime_profile_version" text,
    add column if not exists "openai_text_model" text,
    add column if not exists "openai_tts_model" text;

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_runtime_kind_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_runtime_kind_check" check (
        (
            "runtime_kind" is null
            or "runtime_kind" = any (array['realtime_sts'::text, 'chained_voice'::text])
        )
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_runtime_profile_id_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_runtime_profile_id_check" check (
        (
            "runtime_profile_id" is null
            or char_length(trim(both from "runtime_profile_id")) >= 1
        )
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_runtime_profile_version_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_runtime_profile_version_check" check (
        (
            "runtime_profile_version" is null
            or char_length(trim(both from "runtime_profile_version")) >= 1
        )
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_openai_text_model_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_openai_text_model_check" check (
        (
            "openai_text_model" is null
            or char_length(trim(both from "openai_text_model")) >= 1
        )
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_openai_tts_model_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_openai_tts_model_check" check (
        (
            "openai_tts_model" is null
            or char_length(trim(both from "openai_tts_model")) >= 1
        )
    );

create index if not exists "interview_sessions_runtime_kind_created_at_idx"
    on "public"."interview_sessions" using btree ("runtime_kind", "created_at" desc);

update "public"."interview_sessions"
set
    "runtime_kind" = coalesce("runtime_kind", 'realtime_sts'::text),
    "runtime_profile_id" = coalesce("runtime_profile_id", 'realtime_voice_premium'::text),
    "runtime_profile_version" = coalesce("runtime_profile_version", '2026-03-12'::text)
where "runtime_kind" is null;

alter table "public"."interview_messages"
    drop constraint if exists "interview_messages_source_check";

alter table "public"."interview_messages"
    add constraint "interview_messages_source_check" check (
        (
            "source" = any (array['realtime'::text, 'server'::text, 'system'::text, 'search'::text])
        )
    );

commit;
