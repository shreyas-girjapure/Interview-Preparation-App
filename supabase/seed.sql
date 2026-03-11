-- Keep this file idempotent.
-- Local non-destructive workflows intentionally rerun it via:
--   npm run db:migrate:local:seed
--   npm run db:seed:local

begin;

insert into "public"."voice_interview_pricing_rates" (
    "runtime_kind",
    "model",
    "service_tier",
    "usage_type",
    "unit",
    "price_usd",
    "notes"
)
values
    (
        'realtime_sts',
        'gpt-realtime',
        'standard',
        'realtime_text_input',
        'per_1m_tokens',
        4.000000,
        'Seeded from OpenAI pricing snapshot on 2026-03-11.'
    ),
    (
        'realtime_sts',
        'gpt-realtime',
        'standard',
        'realtime_text_input_cached',
        'per_1m_tokens',
        0.400000,
        'Seeded from OpenAI pricing snapshot on 2026-03-11.'
    ),
    (
        'realtime_sts',
        'gpt-realtime',
        'standard',
        'realtime_text_output',
        'per_1m_tokens',
        16.000000,
        'Seeded from OpenAI pricing snapshot on 2026-03-11.'
    ),
    (
        'realtime_sts',
        'gpt-realtime',
        'standard',
        'realtime_audio_input',
        'per_1m_tokens',
        32.000000,
        'Seeded from OpenAI pricing snapshot on 2026-03-11.'
    ),
    (
        'realtime_sts',
        'gpt-realtime',
        'standard',
        'realtime_audio_input_cached',
        'per_1m_tokens',
        0.400000,
        'Seeded from OpenAI pricing snapshot on 2026-03-11.'
    ),
    (
        'realtime_sts',
        'gpt-realtime',
        'standard',
        'realtime_audio_output',
        'per_1m_tokens',
        64.000000,
        'Seeded from OpenAI pricing snapshot on 2026-03-11.'
    ),
    (
        'realtime_sts',
        'gpt-4o-mini-transcribe',
        'standard',
        'transcription_text_input',
        'per_1m_tokens',
        1.250000,
        'Seeded from OpenAI pricing snapshot on 2026-03-11.'
    ),
    (
        'realtime_sts',
        'gpt-4o-mini-transcribe',
        'standard',
        'transcription_text_output',
        'per_1m_tokens',
        5.000000,
        'Seeded from OpenAI pricing snapshot on 2026-03-11.'
    ),
    (
        'realtime_sts',
        'gpt-4o-mini-transcribe',
        'standard',
        'transcription_audio_input',
        'per_1m_tokens',
        3.000000,
        'Seeded from OpenAI pricing snapshot on 2026-03-11.'
    )
on conflict ("runtime_kind", "model", "service_tier", "usage_type")
do update set
    "service_tier" = excluded."service_tier",
    "unit" = excluded."unit",
    "price_usd" = excluded."price_usd",
    "notes" = excluded."notes",
    "updated_at" = timezone('utc'::text, now());

commit;
