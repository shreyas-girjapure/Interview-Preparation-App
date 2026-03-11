begin;

alter table if exists "public"."voice_interview_pricing_rates"
    add column if not exists "service_tier" text default 'standard'::text not null;

alter table "public"."voice_interview_pricing_rates"
    drop constraint if exists "voice_interview_pricing_rates_service_tier_check";

alter table "public"."voice_interview_pricing_rates"
    add constraint "voice_interview_pricing_rates_service_tier_check" check (
        (char_length(trim(both from "service_tier")) >= 1)
    );

drop index if exists "voice_interview_pricing_rates_runtime_model_usage_idx";

create unique index if not exists "voice_interview_pricing_rates_runtime_model_tier_usage_idx"
    on "public"."voice_interview_pricing_rates" using btree ("runtime_kind", "model", "service_tier", "usage_type");

commit;
