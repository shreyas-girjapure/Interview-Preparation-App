begin;

create table if not exists "public"."voice_interview_pricing_rates" (
    "id" uuid default "gen_random_uuid"() primary key,
    "runtime_kind" text not null,
    "model" text not null,
    "usage_type" text not null,
    "unit" text not null default 'per_1m_tokens'::text,
    "price_usd" numeric(12,6) not null,
    "notes" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint "voice_interview_pricing_rates_runtime_kind_check" check ((char_length(trim(both from "runtime_kind")) >= 1)),
    constraint "voice_interview_pricing_rates_model_check" check ((char_length(trim(both from "model")) >= 1)),
    constraint "voice_interview_pricing_rates_usage_type_check" check ((char_length(trim(both from "usage_type")) >= 1)),
    constraint "voice_interview_pricing_rates_unit_check" check ((char_length(trim(both from "unit")) >= 1)),
    constraint "voice_interview_pricing_rates_price_usd_check" check (("price_usd" >= (0)::numeric))
);

alter table "public"."voice_interview_pricing_rates" owner to "postgres";

create unique index if not exists "voice_interview_pricing_rates_runtime_model_usage_idx"
    on "public"."voice_interview_pricing_rates" using btree ("runtime_kind", "model", "usage_type");

create or replace trigger "voice_interview_pricing_rates_set_updated_at"
before update on "public"."voice_interview_pricing_rates"
for each row execute function "public"."trigger_set_updated_at"();

alter table "public"."voice_interview_pricing_rates" enable row level security;

drop policy if exists "voice_interview_pricing_rates_admin_manage_policy"
    on "public"."voice_interview_pricing_rates";

create policy "voice_interview_pricing_rates_admin_manage_policy"
    on "public"."voice_interview_pricing_rates"
    using ("public"."has_any_role"(array['admin'::"public"."app_role"]))
    with check ("public"."has_any_role"(array['admin'::"public"."app_role"]));

grant all on table "public"."voice_interview_pricing_rates" to "anon";
grant all on table "public"."voice_interview_pricing_rates" to "authenticated";
grant all on table "public"."voice_interview_pricing_rates" to "service_role";

commit;
