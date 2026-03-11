import {
  estimateVoiceInterviewUsage,
  rollupVoiceInterviewUsage,
  VOICE_INTERVIEW_DEFAULT_SERVICE_TIER,
  VOICE_INTERVIEW_RUNTIME_KIND,
  VOICE_INTERVIEW_SERVICE_PROVIDER,
  type VoiceInterviewPricingRate,
  type VoiceInterviewTelemetryEventRequest,
  type VoiceInterviewUsageEventRequest,
} from "@/lib/interview/voice-interview-observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type SupabaseLike = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type InterviewSessionObservabilityRow = {
  cost_estimated_at: string | null;
  cost_status: "pending" | "estimated" | "estimate_failed";
  estimated_cost_currency: string | null;
  openai_model: string | null;
  openai_transcription_model: string | null;
};

type InterviewSessionEventRow = {
  created_at: string;
  event_key: string;
  event_name: string;
  event_source: "client" | "server" | "policy";
  payload_json: Record<string, unknown> | null;
  recorded_at: string;
};

type InterviewSessionUsageEventRow = {
  created_at: string;
  currency: string;
  estimated_cost_usd: number | string | null;
  model: string | null;
  normalized_usage_json: Record<string, unknown> | null;
  provider: string;
  rate_snapshot_json: Record<string, unknown> | null;
  recorded_at: string;
  runtime_kind: string;
  service_tier: string | null;
  usage_key: string;
  usage_source: string;
};

function toIsoNow() {
  return new Date().toISOString();
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toObjectOrNull(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

async function listVoiceInterviewPricingRates(
  usageEvents: VoiceInterviewUsageEventRequest[],
) {
  try {
    const pricingSupabase = createSupabaseServiceRoleClient();
    const modelFilter = Array.from(
      new Set(
        usageEvents
          .map((event) => event.model?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const serviceTierFilter = Array.from(
      new Set(
        usageEvents.map(
          (event) =>
            event.serviceTier?.trim() || VOICE_INTERVIEW_DEFAULT_SERVICE_TIER,
        ),
      ),
    );
    let query = pricingSupabase
      .from("voice_interview_pricing_rates")
      .select(
        "runtime_kind, model, service_tier, usage_type, unit, price_usd, notes",
      );

    if (modelFilter.length > 0) {
      query = query.in("model", modelFilter);
    }

    if (serviceTierFilter.length > 0) {
      query = query.in("service_tier", serviceTierFilter);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      errorMessage: null,
      pricingRates: ((data ?? []) as Array<Record<string, unknown>>)
        .map((row) => {
          const priceUsd = toNumber(row.price_usd);

          if (
            priceUsd === null ||
            typeof row.runtime_kind !== "string" ||
            typeof row.model !== "string" ||
            typeof row.service_tier !== "string" ||
            typeof row.usage_type !== "string" ||
            typeof row.unit !== "string"
          ) {
            return null;
          }

          return {
            model: row.model,
            notes: typeof row.notes === "string" ? row.notes : null,
            priceUsd,
            runtimeKind:
              row.runtime_kind === "chained_voice"
                ? "chained_voice"
                : "realtime_sts",
            serviceTier: row.service_tier,
            unit: row.unit,
            usageType: row.usage_type,
          } satisfies VoiceInterviewPricingRate;
        })
        .filter((row) => row !== null) as VoiceInterviewPricingRate[],
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unable to load voice interview pricing rates.",
      pricingRates: [] as VoiceInterviewPricingRate[],
    };
  }
}

function resolveUsageModel({
  event,
  session,
}: {
  event: VoiceInterviewUsageEventRequest;
  session: InterviewSessionObservabilityRow;
}) {
  const model = event.model?.trim();

  if (model) {
    return model;
  }

  if (event.usageSource === "realtime_input_transcription") {
    return session.openai_transcription_model ?? "gpt-4o-mini-transcribe";
  }

  return session.openai_model ?? "gpt-realtime";
}

async function upsertInterviewSessionEvents({
  events,
  sessionId,
  supabase,
}: {
  events: VoiceInterviewTelemetryEventRequest[];
  sessionId: string;
  supabase: SupabaseLike;
}) {
  if (events.length === 0) {
    return;
  }

  const { error } = await supabase.from("interview_session_events").upsert(
    events.map((event) => ({
      event_key: event.eventKey,
      event_name: event.eventName,
      event_source: event.eventSource,
      payload_json: event.payload ?? null,
      recorded_at: event.recordedAt,
      session_id: sessionId,
    })),
    {
      onConflict: "session_id,event_key",
    },
  );

  if (error) {
    throw new Error(
      `Unable to persist interview session telemetry events: ${error.message}`,
    );
  }
}

async function upsertInterviewSessionUsageEvents({
  pricingRates,
  pricingRatesError,
  session,
  sessionId,
  supabase,
  usageEvents,
}: {
  pricingRates: VoiceInterviewPricingRate[];
  pricingRatesError: string | null;
  session: InterviewSessionObservabilityRow;
  sessionId: string;
  supabase: SupabaseLike;
  usageEvents: VoiceInterviewUsageEventRequest[];
}) {
  if (usageEvents.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("interview_session_usage_events")
    .upsert(
      usageEvents.map((event) => {
        const model = resolveUsageModel({
          event,
          session,
        });
        const estimation = estimateVoiceInterviewUsage({
          model,
          pricingRates,
          runtimeKind:
            event.runtimeKind?.trim() === "chained_voice"
              ? "chained_voice"
              : VOICE_INTERVIEW_RUNTIME_KIND,
          serviceTier:
            event.serviceTier ?? VOICE_INTERVIEW_DEFAULT_SERVICE_TIER,
          usage: event.usage,
          usageSource: event.usageSource,
        });
        const rateSnapshot = {
          ...estimation.rateSnapshot,
          notes: pricingRatesError
            ? [
                ...estimation.notes,
                `pricing_lookup_failed:${pricingRatesError}`,
              ]
            : estimation.notes,
        };

        return {
          currency: "USD",
          estimated_cost_usd: estimation.estimatedCostUsd,
          model,
          normalized_usage_json: estimation.normalizedUsage,
          provider: VOICE_INTERVIEW_SERVICE_PROVIDER,
          provider_usage_json: event.rawUsage ?? event.usage,
          rate_snapshot_json: rateSnapshot,
          recorded_at: event.recordedAt,
          runtime_kind:
            event.runtimeKind?.trim() === "chained_voice"
              ? "chained_voice"
              : VOICE_INTERVIEW_RUNTIME_KIND,
          service_tier:
            event.serviceTier?.trim() || VOICE_INTERVIEW_DEFAULT_SERVICE_TIER,
          session_id: sessionId,
          usage_key: event.usageKey,
          usage_source: event.usageSource,
        };
      }),
      {
        onConflict: "session_id,usage_key",
      },
    );

  if (error) {
    throw new Error(
      `Unable to persist interview session usage events: ${error.message}`,
    );
  }
}

async function listInterviewSessionUsageRows({
  sessionId,
  supabase,
}: {
  sessionId: string;
  supabase: SupabaseLike;
}) {
  const { data, error } = await supabase
    .from("interview_session_usage_events")
    .select(
      "created_at, currency, estimated_cost_usd, model, normalized_usage_json, provider, rate_snapshot_json, recorded_at, runtime_kind, service_tier, usage_key, usage_source",
    )
    .eq("session_id", sessionId)
    .order("recorded_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to read interview session usage events: ${error.message}`,
    );
  }

  return (data ?? []) as InterviewSessionUsageEventRow[];
}

export async function persistInterviewSessionObservability({
  events,
  session,
  sessionId,
  supabase,
  usageEvents,
}: {
  events: VoiceInterviewTelemetryEventRequest[];
  session: InterviewSessionObservabilityRow;
  sessionId: string;
  supabase: SupabaseLike;
  usageEvents: VoiceInterviewUsageEventRequest[];
}) {
  await upsertInterviewSessionEvents({
    events,
    sessionId,
    supabase,
  });

  const { errorMessage: pricingRatesError, pricingRates } =
    usageEvents.length > 0
      ? await listVoiceInterviewPricingRates(usageEvents)
      : {
          errorMessage: null,
          pricingRates: [] as VoiceInterviewPricingRate[],
        };

  await upsertInterviewSessionUsageEvents({
    pricingRates,
    pricingRatesError,
    session,
    sessionId,
    supabase,
    usageEvents,
  });

  if (events.length === 0 && usageEvents.length === 0) {
    return {
      costStatus: session.cost_status,
      estimatedCostUsd: null,
      recordedEventCount: 0,
      recordedUsageEventCount: 0,
      sessionUpdate: {},
    };
  }

  const usageRows = await listInterviewSessionUsageRows({
    sessionId,
    supabase,
  });
  const rollup = rollupVoiceInterviewUsage(
    usageRows.map((row) => ({
      estimatedCostUsd: toNumber(row.estimated_cost_usd),
      normalizedUsage: row.normalized_usage_json,
      rateSnapshot: row.rate_snapshot_json,
      usageSource:
        row.usage_source as VoiceInterviewUsageEventRequest["usageSource"],
    })),
  );
  const latestUsageRecordedAt =
    usageRows.length > 0 ? usageRows[usageRows.length - 1].recorded_at : null;
  const telemetryUpdatedAt = toIsoNow();

  return {
    costStatus: rollup.costStatus,
    estimatedCostUsd: rollup.estimatedCostUsd,
    recordedEventCount: events.length,
    recordedUsageEventCount: usageEvents.length,
    sessionUpdate: {
      cost_breakdown_json: rollup.costBreakdown,
      cost_estimated_at:
        usageRows.length > 0
          ? telemetryUpdatedAt
          : (session.cost_estimated_at ?? null),
      cost_notes_json: rollup.costNotes,
      cost_rate_snapshot_json: rollup.costRateSnapshot,
      cost_status: rollup.costStatus,
      estimated_cost_currency: session.estimated_cost_currency ?? "USD",
      estimated_cost_usd: rollup.estimatedCostUsd,
      last_usage_recorded_at: latestUsageRecordedAt,
      telemetry_updated_at: telemetryUpdatedAt,
      usage_summary_json: rollup.usageSummary,
    },
  };
}

export async function listInterviewSessionObservability({
  sessionId,
  supabase,
}: {
  sessionId: string;
  supabase: SupabaseLike;
}) {
  const [eventsResult, usageResult] = await Promise.all([
    supabase
      .from("interview_session_events")
      .select(
        "created_at, event_key, event_name, event_source, payload_json, recorded_at",
      )
      .eq("session_id", sessionId)
      .order("recorded_at", {
        ascending: true,
      }),
    supabase
      .from("interview_session_usage_events")
      .select(
        "created_at, currency, estimated_cost_usd, model, normalized_usage_json, provider, rate_snapshot_json, recorded_at, runtime_kind, service_tier, usage_key, usage_source",
      )
      .eq("session_id", sessionId)
      .order("recorded_at", {
        ascending: true,
      }),
  ]);

  if (eventsResult.error) {
    throw new Error(
      `Unable to read interview session telemetry events: ${eventsResult.error.message}`,
    );
  }

  if (usageResult.error) {
    throw new Error(
      `Unable to read interview session usage events: ${usageResult.error.message}`,
    );
  }

  return {
    events: ((eventsResult.data ?? []) as InterviewSessionEventRow[]).map(
      (event) => ({
        createdAt: event.created_at,
        eventKey: event.event_key,
        eventName: event.event_name,
        eventSource: event.event_source,
        payload: toObjectOrNull(event.payload_json),
        recordedAt: event.recorded_at,
      }),
    ),
    usageEvents: (
      (usageResult.data ?? []) as InterviewSessionUsageEventRow[]
    ).map((event) => ({
      createdAt: event.created_at,
      currency: event.currency,
      estimatedCostUsd: toNumber(event.estimated_cost_usd),
      model: event.model,
      normalizedUsage: toObjectOrNull(event.normalized_usage_json),
      provider: event.provider,
      rateSnapshot: toObjectOrNull(event.rate_snapshot_json),
      recordedAt: event.recorded_at,
      runtimeKind: event.runtime_kind,
      serviceTier: event.service_tier,
      usageKey: event.usage_key,
      usageSource: event.usage_source,
    })),
  };
}
