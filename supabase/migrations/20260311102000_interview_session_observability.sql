begin;

alter table "public"."interview_sessions"
    add column if not exists "openai_trace_enabled" boolean default false not null,
    add column if not exists "openai_trace_mode" text,
    add column if not exists "openai_trace_group_id" text,
    add column if not exists "openai_trace_workflow_name" text,
    add column if not exists "openai_trace_metadata_json" jsonb,
    add column if not exists "runtime_environment" text,
    add column if not exists "last_disconnect_reason" text,
    add column if not exists "retry_count" integer default 0 not null,
    add column if not exists "telemetry_updated_at" timestamp with time zone,
    add column if not exists "diagnostics_json" jsonb,
    add column if not exists "estimated_cost_usd" numeric(12,6),
    add column if not exists "estimated_cost_currency" text default 'USD'::text not null,
    add column if not exists "cost_status" text default 'pending'::text not null,
    add column if not exists "cost_estimated_at" timestamp with time zone,
    add column if not exists "last_usage_recorded_at" timestamp with time zone,
    add column if not exists "usage_summary_json" jsonb,
    add column if not exists "cost_breakdown_json" jsonb,
    add column if not exists "cost_rate_snapshot_json" jsonb,
    add column if not exists "cost_notes_json" jsonb;

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_openai_trace_mode_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_openai_trace_mode_check" check (
        (
            "openai_trace_mode" is null
            or "openai_trace_mode" = any (array['structured'::text, 'auto'::text, 'disabled'::text])
        )
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_openai_trace_group_id_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_openai_trace_group_id_check" check (
        (
            "openai_trace_group_id" is null
            or char_length(trim(both from "openai_trace_group_id")) >= 1
        )
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_openai_trace_workflow_name_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_openai_trace_workflow_name_check" check (
        (
            "openai_trace_workflow_name" is null
            or char_length(trim(both from "openai_trace_workflow_name")) >= 1
        )
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_runtime_environment_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_runtime_environment_check" check (
        (
            "runtime_environment" is null
            or char_length(trim(both from "runtime_environment")) >= 1
        )
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_last_disconnect_reason_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_last_disconnect_reason_check" check (
        (
            "last_disconnect_reason" is null
            or char_length(trim(both from "last_disconnect_reason")) >= 1
        )
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_retry_count_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_retry_count_check" check (("retry_count" >= 0));

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_estimated_cost_usd_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_estimated_cost_usd_check" check (
        (
            "estimated_cost_usd" is null
            or "estimated_cost_usd" >= (0)::numeric
        )
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_estimated_cost_currency_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_estimated_cost_currency_check" check (
        (char_length(trim(both from "estimated_cost_currency")) >= 1)
    );

alter table "public"."interview_sessions"
    drop constraint if exists "interview_sessions_cost_status_check";

alter table "public"."interview_sessions"
    add constraint "interview_sessions_cost_status_check" check (
        (
            "cost_status" = any (array['pending'::text, 'estimated'::text, 'estimate_failed'::text])
        )
    );

create index if not exists "interview_sessions_cost_status_created_at_idx"
    on "public"."interview_sessions" using btree ("cost_status", "created_at" desc);

create index if not exists "interview_sessions_telemetry_updated_at_idx"
    on "public"."interview_sessions" using btree ("telemetry_updated_at");

create index if not exists "interview_sessions_last_usage_recorded_at_idx"
    on "public"."interview_sessions" using btree ("last_usage_recorded_at");

create table if not exists "public"."interview_session_events" (
    "id" uuid default "gen_random_uuid"() not null,
    "session_id" uuid not null,
    "event_key" text not null,
    "event_name" text not null,
    "event_source" text not null,
    "recorded_at" timestamp with time zone not null,
    "payload_json" jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint "interview_session_events_pkey" primary key ("id"),
    constraint "interview_session_events_session_id_fkey"
        foreign key ("session_id") references "public"."interview_sessions"("id") on delete cascade,
    constraint "interview_session_events_event_key_check"
        check ((char_length(trim(both from "event_key")) >= 1)),
    constraint "interview_session_events_event_name_check"
        check ((char_length(trim(both from "event_name")) >= 1)),
    constraint "interview_session_events_event_source_check"
        check (("event_source" = any (array['client'::text, 'server'::text, 'policy'::text])))
);

alter table "public"."interview_session_events" owner to "postgres";

create unique index if not exists "interview_session_events_session_event_key_idx"
    on "public"."interview_session_events" using btree ("session_id", "event_key");

create index if not exists "interview_session_events_session_recorded_at_idx"
    on "public"."interview_session_events" using btree ("session_id", "recorded_at", "created_at");

create trigger "set_interview_session_events_updated_at"
before update on "public"."interview_session_events"
for each row execute function "public"."trigger_set_updated_at"();

alter table "public"."interview_session_events" enable row level security;

drop policy if exists "interview_session_events_insert_policy"
    on "public"."interview_session_events";

create policy "interview_session_events_insert_policy"
    on "public"."interview_session_events"
    for insert
    with check (
        exists (
            select 1
            from "public"."interview_sessions"
            where "interview_sessions"."id" = "interview_session_events"."session_id"
              and (
                  "interview_sessions"."user_id" = "auth"."uid"()
                  or "public"."has_any_role"(array['admin'::"public"."app_role", 'editor'::"public"."app_role"])
              )
        )
    );

drop policy if exists "interview_session_events_select_policy"
    on "public"."interview_session_events";

create policy "interview_session_events_select_policy"
    on "public"."interview_session_events"
    for select
    using (
        exists (
            select 1
            from "public"."interview_sessions"
            where "interview_sessions"."id" = "interview_session_events"."session_id"
              and (
                  "interview_sessions"."user_id" = "auth"."uid"()
                  or "public"."has_any_role"(array['admin'::"public"."app_role", 'editor'::"public"."app_role"])
              )
        )
    );

drop policy if exists "interview_session_events_update_policy"
    on "public"."interview_session_events";

create policy "interview_session_events_update_policy"
    on "public"."interview_session_events"
    for update
    using (
        exists (
            select 1
            from "public"."interview_sessions"
            where "interview_sessions"."id" = "interview_session_events"."session_id"
              and (
                  "interview_sessions"."user_id" = "auth"."uid"()
                  or "public"."has_any_role"(array['admin'::"public"."app_role", 'editor'::"public"."app_role"])
              )
        )
    )
    with check (
        exists (
            select 1
            from "public"."interview_sessions"
            where "interview_sessions"."id" = "interview_session_events"."session_id"
              and (
                  "interview_sessions"."user_id" = "auth"."uid"()
                  or "public"."has_any_role"(array['admin'::"public"."app_role", 'editor'::"public"."app_role"])
              )
        )
    );

drop policy if exists "interview_session_events_delete_policy"
    on "public"."interview_session_events";

create policy "interview_session_events_delete_policy"
    on "public"."interview_session_events"
    for delete
    using (
        exists (
            select 1
            from "public"."interview_sessions"
            where "interview_sessions"."id" = "interview_session_events"."session_id"
              and (
                  "interview_sessions"."user_id" = "auth"."uid"()
                  or "public"."has_any_role"(array['admin'::"public"."app_role", 'editor'::"public"."app_role"])
              )
        )
    );

grant all on table "public"."interview_session_events" to "anon";
grant all on table "public"."interview_session_events" to "authenticated";
grant all on table "public"."interview_session_events" to "service_role";

create table if not exists "public"."interview_session_usage_events" (
    "id" uuid default "gen_random_uuid"() not null,
    "session_id" uuid not null,
    "usage_key" text not null,
    "usage_source" text not null,
    "provider" text not null default 'openai'::text,
    "runtime_kind" text not null,
    "model" text,
    "service_tier" text,
    "recorded_at" timestamp with time zone not null,
    "provider_usage_json" jsonb default '{}'::jsonb not null,
    "normalized_usage_json" jsonb default '{}'::jsonb not null,
    "rate_snapshot_json" jsonb,
    "estimated_cost_usd" numeric(12,6),
    "currency" text default 'USD'::text not null,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint "interview_session_usage_events_pkey" primary key ("id"),
    constraint "interview_session_usage_events_session_id_fkey"
        foreign key ("session_id") references "public"."interview_sessions"("id") on delete cascade,
    constraint "interview_session_usage_events_usage_key_check"
        check ((char_length(trim(both from "usage_key")) >= 1)),
    constraint "interview_session_usage_events_usage_source_check"
        check (
            (
                "usage_source" = any (
                    array[
                        'realtime_response'::text,
                        'realtime_input_transcription'::text,
                        'server_text_response'::text,
                        'server_audio_transcription'::text,
                        'server_tts'::text
                    ]
                )
            )
        ),
    constraint "interview_session_usage_events_provider_check"
        check ((char_length(trim(both from "provider")) >= 1)),
    constraint "interview_session_usage_events_runtime_kind_check"
        check ((char_length(trim(both from "runtime_kind")) >= 1)),
    constraint "interview_session_usage_events_model_check"
        check ((("model" is null) or (char_length(trim(both from "model")) >= 1))),
    constraint "interview_session_usage_events_service_tier_check"
        check ((("service_tier" is null) or (char_length(trim(both from "service_tier")) >= 1))),
    constraint "interview_session_usage_events_estimated_cost_usd_check"
        check ((("estimated_cost_usd" is null) or ("estimated_cost_usd" >= (0)::numeric))),
    constraint "interview_session_usage_events_currency_check"
        check ((char_length(trim(both from "currency")) >= 1))
);

alter table "public"."interview_session_usage_events" owner to "postgres";

create unique index if not exists "interview_session_usage_events_session_usage_key_idx"
    on "public"."interview_session_usage_events" using btree ("session_id", "usage_key");

create index if not exists "interview_session_usage_events_session_recorded_at_idx"
    on "public"."interview_session_usage_events" using btree ("session_id", "recorded_at", "created_at");

create trigger "set_interview_session_usage_events_updated_at"
before update on "public"."interview_session_usage_events"
for each row execute function "public"."trigger_set_updated_at"();

alter table "public"."interview_session_usage_events" enable row level security;

drop policy if exists "interview_session_usage_events_insert_policy"
    on "public"."interview_session_usage_events";

create policy "interview_session_usage_events_insert_policy"
    on "public"."interview_session_usage_events"
    for insert
    with check (
        exists (
            select 1
            from "public"."interview_sessions"
            where "interview_sessions"."id" = "interview_session_usage_events"."session_id"
              and (
                  "interview_sessions"."user_id" = "auth"."uid"()
                  or "public"."has_any_role"(array['admin'::"public"."app_role", 'editor'::"public"."app_role"])
              )
        )
    );

drop policy if exists "interview_session_usage_events_select_policy"
    on "public"."interview_session_usage_events";

create policy "interview_session_usage_events_select_policy"
    on "public"."interview_session_usage_events"
    for select
    using (
        exists (
            select 1
            from "public"."interview_sessions"
            where "interview_sessions"."id" = "interview_session_usage_events"."session_id"
              and (
                  "interview_sessions"."user_id" = "auth"."uid"()
                  or "public"."has_any_role"(array['admin'::"public"."app_role", 'editor'::"public"."app_role"])
              )
        )
    );

drop policy if exists "interview_session_usage_events_update_policy"
    on "public"."interview_session_usage_events";

create policy "interview_session_usage_events_update_policy"
    on "public"."interview_session_usage_events"
    for update
    using (
        exists (
            select 1
            from "public"."interview_sessions"
            where "interview_sessions"."id" = "interview_session_usage_events"."session_id"
              and (
                  "interview_sessions"."user_id" = "auth"."uid"()
                  or "public"."has_any_role"(array['admin'::"public"."app_role", 'editor'::"public"."app_role"])
              )
        )
    )
    with check (
        exists (
            select 1
            from "public"."interview_sessions"
            where "interview_sessions"."id" = "interview_session_usage_events"."session_id"
              and (
                  "interview_sessions"."user_id" = "auth"."uid"()
                  or "public"."has_any_role"(array['admin'::"public"."app_role", 'editor'::"public"."app_role"])
              )
        )
    );

drop policy if exists "interview_session_usage_events_delete_policy"
    on "public"."interview_session_usage_events";

create policy "interview_session_usage_events_delete_policy"
    on "public"."interview_session_usage_events"
    for delete
    using (
        exists (
            select 1
            from "public"."interview_sessions"
            where "interview_sessions"."id" = "interview_session_usage_events"."session_id"
              and (
                  "interview_sessions"."user_id" = "auth"."uid"()
                  or "public"."has_any_role"(array['admin'::"public"."app_role", 'editor'::"public"."app_role"])
              )
        )
    );

grant all on table "public"."interview_session_usage_events" to "anon";
grant all on table "public"."interview_session_usage_events" to "authenticated";
grant all on table "public"."interview_session_usage_events" to "service_role";

commit;
