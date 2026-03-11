import type { VoiceInterviewScopeType } from "@/lib/interview/voice-scope";

export const VOICE_INTERVIEW_RUNTIME_KIND = "realtime_sts";
export const VOICE_INTERVIEW_SERVICE_PROVIDER = "openai";
export const VOICE_INTERVIEW_DEFAULT_SERVICE_TIER = "standard";
export const VOICE_INTERVIEW_TRACE_WORKFLOW_NAME =
  "voice-interview-realtime-sts";

export type VoiceInterviewTraceMode = "structured" | "auto" | "disabled";

export type VoiceInterviewTelemetryEventSource = "client" | "server" | "policy";

export type VoiceInterviewRuntimeKind = "realtime_sts" | "chained_voice";

export type VoiceInterviewUsageSource =
  | "realtime_response"
  | "realtime_input_transcription"
  | "server_text_response"
  | "server_audio_transcription"
  | "server_tts";

export type VoiceInterviewTelemetryPayload = Record<
  string,
  string | number | boolean | null
>;

export type VoiceInterviewUsagePayload = Record<
  string,
  string | number | boolean | null
>;

export type VoiceInterviewTelemetryEventRequest = {
  eventKey: string;
  eventName: string;
  eventSource: VoiceInterviewTelemetryEventSource;
  payload?: VoiceInterviewTelemetryPayload;
  recordedAt: string;
};

export type VoiceInterviewUsageEventRequest = {
  usageKey: string;
  usageSource: VoiceInterviewUsageSource;
  runtimeKind?: VoiceInterviewRuntimeKind;
  model?: string | null;
  serviceTier?: string | null;
  recordedAt: string;
  usage: VoiceInterviewUsagePayload;
  rawUsage?: Record<string, unknown>;
};

export type VoiceInterviewPricingRate = {
  model: string;
  notes?: string | null;
  priceUsd: number;
  runtimeKind: VoiceInterviewRuntimeKind;
  serviceTier: string;
  unit: string;
  usageType: string;
};

export type VoiceInterviewTraceConfig = {
  enabled: boolean;
  groupId: string | null;
  metadata: Record<string, string>;
  mode: VoiceInterviewTraceMode;
  runtimeEnvironment: string;
  workflowName: string | null;
};

type RealtimeResponseNormalizedUsage = {
  inputAudioTokens: number;
  inputCachedAudioTokens: number;
  inputCachedTextTokens: number;
  inputTextTokens: number;
  inputTokens: number;
  outputAudioTokens: number;
  outputTextTokens: number;
  outputTokens: number;
  totalTokens: number;
  usageType: "realtime_response";
};

type RealtimeInputTranscriptionTokenUsage = {
  inputAudioTokens: number;
  inputTextTokens: number;
  outputTextTokens: number;
  totalTokens: number;
  usageType: "realtime_input_transcription";
  usageUnit: "tokens";
};

type RealtimeInputTranscriptionDurationUsage = {
  seconds: number;
  usageType: "realtime_input_transcription";
  usageUnit: "duration";
};

export type VoiceInterviewNormalizedUsage =
  | RealtimeInputTranscriptionDurationUsage
  | RealtimeInputTranscriptionTokenUsage
  | RealtimeResponseNormalizedUsage;

export type VoiceInterviewUsageEstimation = {
  estimatedCostUsd: number | null;
  normalizedUsage: VoiceInterviewNormalizedUsage;
  notes: string[];
  rateSnapshot: {
    currency: "USD";
    model: string;
    notes: string[];
    rates: Array<{
      priceUsd: number;
      unit: string;
      usageType: string;
    }>;
    runtimeKind: VoiceInterviewRuntimeKind;
    serviceTier: string;
  };
  status: "estimated" | "estimate_failed";
};

type VoiceInterviewUsageRollupInput = {
  estimatedCostUsd: number | null;
  normalizedUsage: unknown;
  rateSnapshot: unknown;
  usageSource: VoiceInterviewUsageSource;
};

export type VoiceInterviewUsageRollup = {
  costBreakdown: Record<string, number> | null;
  costNotes: string[] | null;
  costRateSnapshot: Record<string, unknown> | null;
  costStatus: "pending" | "estimated" | "estimate_failed";
  estimatedCostUsd: number | null;
  usageSummary: Record<string, number> | null;
};

function toFiniteNumber(value: unknown) {
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

function pickNumber(
  source: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = toFiniteNumber(source[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function roundUsd(value: number) {
  return Number(value.toFixed(6));
}

function buildPricingRateKey(rate: {
  model: string;
  runtimeKind: VoiceInterviewRuntimeKind;
  serviceTier: string;
  usageType: string;
}) {
  return [rate.runtimeKind, rate.model, rate.serviceTier, rate.usageType].join(
    ":",
  );
}

function buildPricingRateIndex(pricingRates: VoiceInterviewPricingRate[]) {
  return new Map(
    pricingRates.map((rate) => [buildPricingRateKey(rate), rate] as const),
  );
}

function normalizeRealtimeResponseUsage(
  usage: VoiceInterviewUsagePayload,
): RealtimeResponseNormalizedUsage {
  const inputTokens = pickNumber(usage, "input_tokens", "inputTokens") ?? 0;
  const outputTokens = pickNumber(usage, "output_tokens", "outputTokens") ?? 0;
  const totalTokens = pickNumber(usage, "total_tokens", "totalTokens") ?? 0;
  const totalTextInput =
    pickNumber(usage, "input_text_tokens", "inputTextTokens") ?? 0;
  const cachedTextInput =
    pickNumber(
      usage,
      "input_cached_text_tokens",
      "inputCachedTextTokens",
      "cached_text_input_tokens",
    ) ?? 0;
  const totalAudioInput =
    pickNumber(usage, "input_audio_tokens", "inputAudioTokens") ?? 0;
  const cachedAudioInput =
    pickNumber(
      usage,
      "input_cached_audio_tokens",
      "inputCachedAudioTokens",
      "cached_audio_input_tokens",
    ) ?? 0;

  return {
    inputAudioTokens: Math.max(0, totalAudioInput - cachedAudioInput),
    inputCachedAudioTokens: Math.max(0, cachedAudioInput),
    inputCachedTextTokens: Math.max(0, cachedTextInput),
    inputTextTokens: Math.max(0, totalTextInput - cachedTextInput),
    inputTokens,
    outputAudioTokens:
      pickNumber(usage, "output_audio_tokens", "outputAudioTokens") ?? 0,
    outputTextTokens:
      pickNumber(usage, "output_text_tokens", "outputTextTokens") ?? 0,
    outputTokens,
    totalTokens,
    usageType: "realtime_response",
  };
}

function normalizeRealtimeInputTranscriptionUsage(
  usage: VoiceInterviewUsagePayload,
):
  | RealtimeInputTranscriptionDurationUsage
  | RealtimeInputTranscriptionTokenUsage {
  const usageType = typeof usage.type === "string" ? usage.type : null;

  if (usageType === "duration") {
    return {
      seconds: pickNumber(usage, "seconds") ?? 0,
      usageType: "realtime_input_transcription",
      usageUnit: "duration",
    };
  }

  return {
    inputAudioTokens:
      pickNumber(usage, "input_audio_tokens", "inputAudioTokens") ?? 0,
    inputTextTokens:
      pickNumber(usage, "input_text_tokens", "inputTextTokens") ?? 0,
    outputTextTokens:
      pickNumber(usage, "output_text_tokens", "outputTextTokens") ?? 0,
    totalTokens: pickNumber(usage, "total_tokens", "totalTokens") ?? 0,
    usageType: "realtime_input_transcription",
    usageUnit: "tokens",
  };
}

export function buildVoiceInterviewTraceConfig({
  persistenceVersion,
  promptVersion,
  runtimeEnvironment,
  scopeSlug,
  scopeType,
  searchPolicyVersion,
  sessionId,
  transportVersion,
}: {
  persistenceVersion: string;
  promptVersion: string;
  runtimeEnvironment?: string | null;
  scopeSlug: string;
  scopeType: VoiceInterviewScopeType;
  searchPolicyVersion: string;
  sessionId: string;
  transportVersion: string;
}): VoiceInterviewTraceConfig {
  return {
    enabled: true,
    groupId: sessionId,
    metadata: {
      localSessionId: sessionId,
      runtimeKind: VOICE_INTERVIEW_RUNTIME_KIND,
      runtimePersistenceVersion: persistenceVersion,
      runtimePromptVersion: promptVersion,
      runtimeSearchPolicyVersion: searchPolicyVersion,
      runtimeTransportVersion: transportVersion,
      scopeSlug,
      scopeType,
    },
    mode: "structured",
    runtimeEnvironment:
      runtimeEnvironment ??
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      "development",
    workflowName: VOICE_INTERVIEW_TRACE_WORKFLOW_NAME,
  };
}

export function estimateVoiceInterviewUsage({
  model,
  pricingRates,
  runtimeKind,
  serviceTier,
  usage,
  usageSource,
}: {
  model: string;
  pricingRates: VoiceInterviewPricingRate[];
  runtimeKind: VoiceInterviewRuntimeKind;
  serviceTier?: string | null;
  usage: VoiceInterviewUsagePayload;
  usageSource: VoiceInterviewUsageSource;
}): VoiceInterviewUsageEstimation {
  const normalizedUsage =
    usageSource === "realtime_input_transcription"
      ? normalizeRealtimeInputTranscriptionUsage(usage)
      : normalizeRealtimeResponseUsage(usage);
  const resolvedServiceTier =
    serviceTier?.trim() || VOICE_INTERVIEW_DEFAULT_SERVICE_TIER;
  const pricingRateIndex = buildPricingRateIndex(pricingRates);
  const notes: string[] = [];
  const rateSnapshot: VoiceInterviewUsageEstimation["rateSnapshot"] = {
    currency: "USD",
    model,
    notes,
    rates: [],
    runtimeKind,
    serviceTier: resolvedServiceTier,
  };
  let estimatedCostUsd = 0;
  let estimateFailed = false;

  const addCost = (usageType: string, amount: number) => {
    if (amount <= 0) {
      return;
    }

    const rate = pricingRateIndex.get(
      buildPricingRateKey({
        model,
        runtimeKind,
        serviceTier: resolvedServiceTier,
        usageType,
      }),
    );

    if (!rate) {
      notes.push(`missing_rate:${usageType}`);
      estimateFailed = true;
      return;
    }

    if (rate.unit !== "per_1m_tokens" && rate.unit !== "per_second") {
      notes.push(`unsupported_unit:${usageType}:${rate.unit}`);
      estimateFailed = true;
      return;
    }

    rateSnapshot.rates.push({
      priceUsd: rate.priceUsd,
      unit: rate.unit,
      usageType,
    });
    estimatedCostUsd +=
      rate.unit === "per_1m_tokens"
        ? amount * (rate.priceUsd / 1_000_000)
        : amount * rate.priceUsd;
  };

  if (normalizedUsage.usageType === "realtime_response") {
    addCost("realtime_text_input", normalizedUsage.inputTextTokens);
    addCost(
      "realtime_text_input_cached",
      normalizedUsage.inputCachedTextTokens,
    );
    addCost("realtime_text_output", normalizedUsage.outputTextTokens);
    addCost("realtime_audio_input", normalizedUsage.inputAudioTokens);
    addCost(
      "realtime_audio_input_cached",
      normalizedUsage.inputCachedAudioTokens,
    );
    addCost("realtime_audio_output", normalizedUsage.outputAudioTokens);
  } else if (normalizedUsage.usageUnit === "tokens") {
    addCost("transcription_audio_input", normalizedUsage.inputAudioTokens);
    addCost("transcription_text_input", normalizedUsage.inputTextTokens);
    addCost("transcription_text_output", normalizedUsage.outputTextTokens);
  } else {
    addCost("transcription_audio_seconds", normalizedUsage.seconds);
  }

  return {
    estimatedCostUsd: roundUsd(estimatedCostUsd),
    normalizedUsage,
    notes,
    rateSnapshot,
    status: estimateFailed ? "estimate_failed" : "estimated",
  };
}

function readUsageSummaryValue(summary: Record<string, number>, key: string) {
  summary[key] ??= 0;
  return summary[key];
}

function parseNormalizedUsage(
  normalizedUsage: unknown,
): VoiceInterviewNormalizedUsage | null {
  const value = asRecord(normalizedUsage);

  if (!value || typeof value.usageType !== "string") {
    return null;
  }

  if (value.usageType === "realtime_response") {
    return {
      inputAudioTokens:
        pickNumber(value, "inputAudioTokens", "input_audio_tokens") ?? 0,
      inputCachedAudioTokens:
        pickNumber(
          value,
          "inputCachedAudioTokens",
          "input_cached_audio_tokens",
        ) ?? 0,
      inputCachedTextTokens:
        pickNumber(
          value,
          "inputCachedTextTokens",
          "input_cached_text_tokens",
        ) ?? 0,
      inputTextTokens:
        pickNumber(value, "inputTextTokens", "input_text_tokens") ?? 0,
      inputTokens: pickNumber(value, "inputTokens", "input_tokens") ?? 0,
      outputAudioTokens:
        pickNumber(value, "outputAudioTokens", "output_audio_tokens") ?? 0,
      outputTextTokens:
        pickNumber(value, "outputTextTokens", "output_text_tokens") ?? 0,
      outputTokens: pickNumber(value, "outputTokens", "output_tokens") ?? 0,
      totalTokens: pickNumber(value, "totalTokens", "total_tokens") ?? 0,
      usageType: "realtime_response",
    };
  }

  if (value.usageType !== "realtime_input_transcription") {
    return null;
  }

  if (value.usageUnit === "duration") {
    return {
      seconds: pickNumber(value, "seconds") ?? 0,
      usageType: "realtime_input_transcription",
      usageUnit: "duration",
    };
  }

  return {
    inputAudioTokens:
      pickNumber(value, "inputAudioTokens", "input_audio_tokens") ?? 0,
    inputTextTokens:
      pickNumber(value, "inputTextTokens", "input_text_tokens") ?? 0,
    outputTextTokens:
      pickNumber(value, "outputTextTokens", "output_text_tokens") ?? 0,
    totalTokens: pickNumber(value, "totalTokens", "total_tokens") ?? 0,
    usageType: "realtime_input_transcription",
    usageUnit: "tokens",
  };
}

function parseRateSnapshot(value: unknown) {
  const snapshot = asRecord(value);
  const rates = Array.isArray(snapshot?.rates) ? snapshot.rates : [];
  const notes = Array.isArray(snapshot?.notes)
    ? snapshot.notes.filter((note): note is string => typeof note === "string")
    : [];

  return {
    notes,
    rates: rates
      .map((rate) => {
        const candidate = asRecord(rate);

        if (!candidate || typeof candidate.usageType !== "string") {
          return null;
        }

        const priceUsd = toFiniteNumber(candidate.priceUsd);

        if (priceUsd === null || typeof candidate.unit !== "string") {
          return null;
        }

        return {
          priceUsd,
          unit: candidate.unit,
          usageType: candidate.usageType,
        };
      })
      .filter((rate) => rate !== null),
  };
}

export function rollupVoiceInterviewUsage(
  usageRows: VoiceInterviewUsageRollupInput[],
): VoiceInterviewUsageRollup {
  if (usageRows.length === 0) {
    return {
      costBreakdown: null,
      costNotes: null,
      costRateSnapshot: null,
      costStatus: "pending",
      estimatedCostUsd: null,
      usageSummary: null,
    };
  }

  const usageSummary: Record<string, number> = {};
  const costBreakdown: Record<string, number> = {
    realtimeInputTranscriptionUsd: 0,
    realtimeResponseUsd: 0,
    totalUsd: 0,
  };
  const costNotes = new Set<string>();
  const rates = new Map<
    string,
    {
      priceUsd: number;
      unit: string;
      usageType: string;
    }
  >();
  let hasEstimateFailure = false;

  for (const row of usageRows) {
    const estimatedCostUsd = row.estimatedCostUsd ?? 0;
    const normalizedUsage = parseNormalizedUsage(row.normalizedUsage);
    const rateSnapshot = parseRateSnapshot(row.rateSnapshot);

    for (const note of rateSnapshot.notes) {
      costNotes.add(note);
      hasEstimateFailure = true;
    }

    for (const rate of rateSnapshot.rates) {
      rates.set(`${rate.usageType}:${rate.unit}`, rate);
    }

    if (!normalizedUsage) {
      costNotes.add(`invalid_normalized_usage:${row.usageSource}`);
      hasEstimateFailure = true;
      continue;
    }

    costBreakdown.totalUsd += estimatedCostUsd;

    if (normalizedUsage.usageType === "realtime_response") {
      readUsageSummaryValue(usageSummary, "realtimeResponses");
      usageSummary.realtimeResponses += 1;
      usageSummary.inputTextTokens =
        readUsageSummaryValue(usageSummary, "inputTextTokens") +
        normalizedUsage.inputTextTokens;
      usageSummary.inputCachedTextTokens =
        readUsageSummaryValue(usageSummary, "inputCachedTextTokens") +
        normalizedUsage.inputCachedTextTokens;
      usageSummary.outputTextTokens =
        readUsageSummaryValue(usageSummary, "outputTextTokens") +
        normalizedUsage.outputTextTokens;
      usageSummary.inputAudioTokens =
        readUsageSummaryValue(usageSummary, "inputAudioTokens") +
        normalizedUsage.inputAudioTokens;
      usageSummary.inputCachedAudioTokens =
        readUsageSummaryValue(usageSummary, "inputCachedAudioTokens") +
        normalizedUsage.inputCachedAudioTokens;
      usageSummary.outputAudioTokens =
        readUsageSummaryValue(usageSummary, "outputAudioTokens") +
        normalizedUsage.outputAudioTokens;
      costBreakdown.realtimeResponseUsd += estimatedCostUsd;
      continue;
    }

    readUsageSummaryValue(usageSummary, "realtimeInputTranscriptions");
    usageSummary.realtimeInputTranscriptions += 1;
    costBreakdown.realtimeInputTranscriptionUsd += estimatedCostUsd;

    if (normalizedUsage.usageUnit === "duration") {
      usageSummary.transcriptionAudioSeconds =
        readUsageSummaryValue(usageSummary, "transcriptionAudioSeconds") +
        normalizedUsage.seconds;
      hasEstimateFailure = hasEstimateFailure || rateSnapshot.notes.length > 0;
      continue;
    }

    usageSummary.transcriptionAudioInputTokens =
      readUsageSummaryValue(usageSummary, "transcriptionAudioInputTokens") +
      normalizedUsage.inputAudioTokens;
    usageSummary.transcriptionTextInputTokens =
      readUsageSummaryValue(usageSummary, "transcriptionTextInputTokens") +
      normalizedUsage.inputTextTokens;
    usageSummary.transcriptionTextOutputTokens =
      readUsageSummaryValue(usageSummary, "transcriptionTextOutputTokens") +
      normalizedUsage.outputTextTokens;
  }

  const estimatedCostUsd = roundUsd(costBreakdown.totalUsd);

  return {
    costBreakdown: {
      realtimeInputTranscriptionUsd: roundUsd(
        costBreakdown.realtimeInputTranscriptionUsd,
      ),
      realtimeResponseUsd: roundUsd(costBreakdown.realtimeResponseUsd),
      totalUsd: estimatedCostUsd,
    },
    costNotes: costNotes.size > 0 ? Array.from(costNotes) : null,
    costRateSnapshot:
      rates.size > 0
        ? {
            currency: "USD",
            rates: Array.from(rates.values()),
          }
        : null,
    costStatus: hasEstimateFailure ? "estimate_failed" : "estimated",
    estimatedCostUsd,
    usageSummary,
  };
}
