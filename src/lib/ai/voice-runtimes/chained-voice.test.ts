import { describe, expect, it } from "vitest";

import {
  listChainedVoiceRuntimeProfiles,
  type ChainedVoiceRuntimeProfile,
} from "@/lib/ai/voice-runtimes/chained-voice";

const voiceInterviewEnv = {
  OPENAI_API_KEY: "openai-key",
  OPENAI_CHAINED_AUTO_COMMIT_SILENCE_MS: 1200,
  OPENAI_CHAINED_DEFAULT_VOICE: "marin",
  OPENAI_CHAINED_MAX_TURN_SECONDS: 45,
  OPENAI_CHAINED_OPENING_MAX_OUTPUT_TOKENS: 220,
  OPENAI_CHAINED_REASONING_EFFORT_PREMIUM: "low",
  OPENAI_CHAINED_REPLY_MAX_OUTPUT_TOKENS: 420,
  OPENAI_CHAINED_TEXT_MODEL_BALANCED: "gpt-5.2",
  OPENAI_CHAINED_TEXT_MODEL_PREMIUM: "gpt-5.4",
  OPENAI_CHAINED_TRANSCRIBE_MODEL: "gpt-4o-mini-transcribe",
  OPENAI_CHAINED_TTS_MODEL: "gpt-4o-mini-tts",
  OPENAI_VOICE_GROUNDING_CACHE_TTL_MS: 21_600_000,
  OPENAI_VOICE_GROUNDING_MAX_OUTPUT_TOKENS: 1_200,
  OPENAI_VOICE_GROUNDING_MODEL: "gpt-5.4",
  OPENAI_VOICE_GROUNDING_STALE_TTL_MS: 86_400_000,
  OPENAI_VOICE_GROUNDING_TIMEOUT_MS: 3_500,
  OPENAI_REALTIME_BOOTSTRAP_TIMEOUT_MS: 20_000,
  OPENAI_REALTIME_CLIENT_SECRET_TTL_SECONDS: 600,
  OPENAI_REALTIME_MAX_OUTPUT_TOKENS: 1_024,
  OPENAI_REALTIME_MODEL: "gpt-realtime",
  OPENAI_REALTIME_NOISE_REDUCTION_TYPE: "near_field",
  OPENAI_REALTIME_SERVER_VAD_PREFIX_PADDING_MS: 450,
  OPENAI_REALTIME_SERVER_VAD_SILENCE_DURATION_MS: 1200,
  OPENAI_REALTIME_SERVER_VAD_THRESHOLD: 0.72,
  OPENAI_REALTIME_TRANSCRIBE_LANGUAGE: "en",
  OPENAI_REALTIME_TRANSCRIBE_MODEL: "gpt-4o-mini-transcribe",
  OPENAI_REALTIME_VOICE: "marin",
  VOICE_INTERVIEW_DEFAULT_RUNTIME_PREFERENCE: "realtime_sts",
} as const;

describe("chained voice runtime profiles", () => {
  it("uses quality-tuned default models and token budgets", () => {
    const profiles = listChainedVoiceRuntimeProfiles(
      voiceInterviewEnv as never,
    );

    expect(profiles.chained_voice_balanced).toEqual(
      expect.objectContaining<Partial<ChainedVoiceRuntimeProfile>>({
        openingMaxOutputTokens: 220,
        replyMaxOutputTokens: 420,
        textModel: "gpt-5.2",
      }),
    );
    expect(profiles.chained_voice_premium).toEqual(
      expect.objectContaining<Partial<ChainedVoiceRuntimeProfile>>({
        openingMaxOutputTokens: 220,
        reasoningEffort: "low",
        replyMaxOutputTokens: 420,
        textModel: "gpt-5.4",
      }),
    );
  });

  it("applies env overrides to both runtime profiles", () => {
    const profiles = listChainedVoiceRuntimeProfiles({
      ...voiceInterviewEnv,
      OPENAI_CHAINED_OPENING_MAX_OUTPUT_TOKENS: 260,
      OPENAI_CHAINED_REPLY_MAX_OUTPUT_TOKENS: 512,
      OPENAI_CHAINED_TEXT_MODEL_BALANCED: "gpt-5.1",
      OPENAI_CHAINED_TEXT_MODEL_PREMIUM: "gpt-5.4-pro",
    } as never);

    expect(profiles.chained_voice_balanced).toEqual(
      expect.objectContaining<Partial<ChainedVoiceRuntimeProfile>>({
        openingMaxOutputTokens: 260,
        replyMaxOutputTokens: 512,
        textModel: "gpt-5.1",
      }),
    );
    expect(profiles.chained_voice_premium).toEqual(
      expect.objectContaining<Partial<ChainedVoiceRuntimeProfile>>({
        openingMaxOutputTokens: 260,
        replyMaxOutputTokens: 512,
        textModel: "gpt-5.4-pro",
      }),
    );
  });
});
