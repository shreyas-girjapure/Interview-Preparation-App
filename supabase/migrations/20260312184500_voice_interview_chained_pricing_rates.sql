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
        'chained_voice',
        'gpt-5.4',
        'standard',
        'text_input',
        'per_1m_tokens',
        2.500000,
        'Seeded from OpenAI pricing snapshot on 2026-03-12.'
    ),
    (
        'chained_voice',
        'gpt-5.4',
        'standard',
        'text_input_cached',
        'per_1m_tokens',
        0.250000,
        'Seeded from OpenAI pricing snapshot on 2026-03-12.'
    ),
    (
        'chained_voice',
        'gpt-5.4',
        'standard',
        'text_output',
        'per_1m_tokens',
        15.000000,
        'Seeded from OpenAI pricing snapshot on 2026-03-12.'
    ),
    (
        'chained_voice',
        'gpt-5.2',
        'standard',
        'text_input',
        'per_1m_tokens',
        1.750000,
        'Seeded from OpenAI pricing snapshot on 2026-03-12.'
    ),
    (
        'chained_voice',
        'gpt-5.2',
        'standard',
        'text_input_cached',
        'per_1m_tokens',
        0.175000,
        'Seeded from OpenAI pricing snapshot on 2026-03-12.'
    ),
    (
        'chained_voice',
        'gpt-5.2',
        'standard',
        'text_output',
        'per_1m_tokens',
        14.000000,
        'Seeded from OpenAI pricing snapshot on 2026-03-12.'
    ),
    (
        'chained_voice',
        'gpt-4o-mini-transcribe',
        'standard',
        'transcription_text_input',
        'per_1m_tokens',
        1.250000,
        'Seeded from OpenAI pricing snapshot on 2026-03-12.'
    ),
    (
        'chained_voice',
        'gpt-4o-mini-transcribe',
        'standard',
        'transcription_text_output',
        'per_1m_tokens',
        5.000000,
        'Seeded from OpenAI pricing snapshot on 2026-03-12.'
    ),
    (
        'chained_voice',
        'gpt-4o-mini-transcribe',
        'standard',
        'transcription_audio_input',
        'per_1m_tokens',
        3.000000,
        'Seeded from OpenAI pricing snapshot on 2026-03-12.'
    ),
    (
        'chained_voice',
        'gpt-4o-mini-tts',
        'standard',
        'tts_characters',
        'per_1m_characters',
        15.000000,
        'Character-based fallback seeded from OpenAI speech generation pricing snapshot on 2026-03-12 because the speech endpoint reports characters, not output audio tokens.'
    )
on conflict ("runtime_kind", "model", "service_tier", "usage_type")
do update set
    "service_tier" = excluded."service_tier",
    "unit" = excluded."unit",
    "price_usd" = excluded."price_usd",
    "notes" = excluded."notes",
    "updated_at" = timezone('utc'::text, now());
