import { describe, expect, it } from "vitest";

import {
  buildVoiceInterviewTraceConfig,
  estimateVoiceInterviewUsage,
  rollupVoiceInterviewUsage,
} from "@/lib/interview/voice-interview-observability";

const pricingRates = [
  {
    model: "gpt-realtime",
    priceUsd: 4,
    runtimeKind: "realtime_sts",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "realtime_text_input",
  },
  {
    model: "gpt-realtime",
    priceUsd: 0.4,
    runtimeKind: "realtime_sts",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "realtime_text_input_cached",
  },
  {
    model: "gpt-realtime",
    priceUsd: 16,
    runtimeKind: "realtime_sts",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "realtime_text_output",
  },
  {
    model: "gpt-realtime",
    priceUsd: 32,
    runtimeKind: "realtime_sts",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "realtime_audio_input",
  },
  {
    model: "gpt-realtime",
    priceUsd: 0.4,
    runtimeKind: "realtime_sts",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "realtime_audio_input_cached",
  },
  {
    model: "gpt-realtime",
    priceUsd: 64,
    runtimeKind: "realtime_sts",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "realtime_audio_output",
  },
  {
    model: "gpt-4o-mini-transcribe",
    priceUsd: 1.25,
    runtimeKind: "realtime_sts",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "transcription_text_input",
  },
  {
    model: "gpt-4o-mini-transcribe",
    priceUsd: 5,
    runtimeKind: "realtime_sts",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "transcription_text_output",
  },
  {
    model: "gpt-4o-mini-transcribe",
    priceUsd: 3,
    runtimeKind: "realtime_sts",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "transcription_audio_input",
  },
  {
    model: "gpt-5.4",
    priceUsd: 2.5,
    runtimeKind: "chained_voice",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "text_input",
  },
  {
    model: "gpt-5.4",
    priceUsd: 0.25,
    runtimeKind: "chained_voice",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "text_input_cached",
  },
  {
    model: "gpt-5.4",
    priceUsd: 15,
    runtimeKind: "chained_voice",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "text_output",
  },
  {
    model: "gpt-4o-mini-transcribe",
    priceUsd: 1.25,
    runtimeKind: "chained_voice",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "transcription_text_input",
  },
  {
    model: "gpt-4o-mini-transcribe",
    priceUsd: 5,
    runtimeKind: "chained_voice",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "transcription_text_output",
  },
  {
    model: "gpt-4o-mini-transcribe",
    priceUsd: 3,
    runtimeKind: "chained_voice",
    serviceTier: "standard",
    unit: "per_1m_tokens",
    usageType: "transcription_audio_input",
  },
  {
    model: "gpt-4o-mini-tts",
    priceUsd: 15,
    runtimeKind: "chained_voice",
    serviceTier: "standard",
    unit: "per_1m_characters",
    usageType: "tts_characters",
  },
];

describe("voice interview observability", () => {
  it("builds structured trace metadata from the local session context", () => {
    const trace = buildVoiceInterviewTraceConfig({
      persistenceVersion: "transcript-persistence-v1",
      promptVersion: "voice-prompt-v2-2026-03-10",
      runtimeEnvironment: "preview",
      scopeSlug: "javascript",
      scopeType: "topic",
      searchPolicyVersion: "docs-search-v1",
      sessionId: "session-1",
      transportVersion: "agents-webrtc-v1",
    });

    expect(trace).toEqual(
      expect.objectContaining({
        enabled: true,
        groupId: "session-1",
        mode: "structured",
        runtimeEnvironment: "preview",
        workflowName: "voice-interview-realtime-sts",
      }),
    );
    expect(trace.metadata).toEqual(
      expect.objectContaining({
        localSessionId: "session-1",
        scopeSlug: "javascript",
        scopeType: "topic",
      }),
    );
  });

  it("estimates realtime response cost without double-counting cached tokens", () => {
    const estimation = estimateVoiceInterviewUsage({
      model: "gpt-realtime",
      pricingRates,
      runtimeKind: "realtime_sts",
      serviceTier: "standard",
      usage: {
        input_audio_tokens: 1000,
        input_cached_audio_tokens: 250,
        input_cached_text_tokens: 100,
        input_text_tokens: 400,
        input_tokens: 1400,
        output_audio_tokens: 500,
        output_text_tokens: 200,
        output_tokens: 700,
        total_tokens: 2100,
      },
      usageSource: "realtime_response",
    });

    expect(estimation.status).toBe("estimated");
    expect(estimation.normalizedUsage).toEqual(
      expect.objectContaining({
        inputAudioTokens: 750,
        inputCachedAudioTokens: 250,
        inputCachedTextTokens: 100,
        inputTextTokens: 300,
      }),
    );
    expect(estimation.estimatedCostUsd).toBe(0.06054);
  });

  it("estimates transcription cost from audio and text token usage", () => {
    const estimation = estimateVoiceInterviewUsage({
      model: "gpt-4o-mini-transcribe",
      pricingRates,
      runtimeKind: "realtime_sts",
      serviceTier: "standard",
      usage: {
        input_audio_tokens: 1000,
        input_text_tokens: 200,
        output_text_tokens: 50,
        total_tokens: 1250,
        type: "tokens",
      },
      usageSource: "realtime_input_transcription",
    });

    expect(estimation.status).toBe("estimated");
    expect(estimation.estimatedCostUsd).toBe(0.0035);
  });

  it("estimates chained text response cost with cached input support", () => {
    const estimation = estimateVoiceInterviewUsage({
      model: "gpt-5.4",
      pricingRates,
      runtimeKind: "chained_voice",
      serviceTier: "standard",
      usage: {
        input_cached_text_tokens: 100,
        input_text_tokens: 900,
        input_tokens: 1_000,
        output_reasoning_tokens: 20,
        output_text_tokens: 50,
        output_tokens: 50,
        total_tokens: 1_050,
      },
      usageSource: "server_text_response",
    });

    expect(estimation.status).toBe("estimated");
    expect(estimation.estimatedCostUsd).toBe(0.003025);
    expect(estimation.rateSnapshot.rates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          priceUsd: 2.5,
          usageType: "text_input",
        }),
        expect.objectContaining({
          priceUsd: 0.25,
          usageType: "text_input_cached",
        }),
        expect.objectContaining({
          priceUsd: 15,
          usageType: "text_output",
        }),
      ]),
    );
  });

  it("estimates chained speech generation cost from character usage", () => {
    const estimation = estimateVoiceInterviewUsage({
      model: "gpt-4o-mini-tts",
      pricingRates,
      runtimeKind: "chained_voice",
      serviceTier: "standard",
      usage: {
        input_characters: 150,
        output_audio_bytes: 140_160,
      },
      usageSource: "server_tts",
    });

    expect(estimation.status).toBe("estimated");
    expect(estimation.estimatedCostUsd).toBe(0.00225);
    expect(estimation.rateSnapshot.rates).toEqual([
      expect.objectContaining({
        priceUsd: 15,
        unit: "per_1m_characters",
        usageType: "tts_characters",
      }),
    ]);
  });

  it("rolls up usage rows and preserves estimate failures in the session summary", () => {
    const rollup = rollupVoiceInterviewUsage([
      {
        estimatedCostUsd: 0.05284,
        normalizedUsage: {
          inputAudioTokens: 750,
          inputCachedAudioTokens: 250,
          inputCachedTextTokens: 100,
          inputTextTokens: 300,
          inputTokens: 1400,
          outputAudioTokens: 500,
          outputTextTokens: 200,
          outputTokens: 700,
          totalTokens: 2100,
          usageType: "realtime_response",
        },
        rateSnapshot: {
          notes: [],
          rates: [
            {
              priceUsd: 4,
              unit: "per_1m_tokens",
              usageType: "realtime_text_input",
            },
          ],
        },
        usageSource: "realtime_response",
      },
      {
        estimatedCostUsd: 0,
        normalizedUsage: {
          seconds: 12,
          usageType: "realtime_input_transcription",
          usageUnit: "duration",
        },
        rateSnapshot: {
          notes: ["missing_rate:transcription_audio_seconds"],
          rates: [],
        },
        usageSource: "realtime_input_transcription",
      },
    ]);

    expect(rollup.costStatus).toBe("estimate_failed");
    expect(rollup.estimatedCostUsd).toBe(0.05284);
    expect(rollup.usageSummary).toEqual(
      expect.objectContaining({
        inputAudioTokens: 750,
        realtimeInputTranscriptions: 1,
        realtimeResponses: 1,
        transcriptionAudioSeconds: 12,
      }),
    );
    expect(rollup.costNotes).toContain(
      "missing_rate:transcription_audio_seconds",
    );
  });
});
