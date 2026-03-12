import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

const mockParse = vi.fn();
const mockGetServerOpenAiClient = vi.fn();
const mockGetVoiceInterviewEnv = vi.fn();

vi.mock("@/lib/ai/server-openai", () => ({
  getServerOpenAiClient: mockGetServerOpenAiClient,
}));

vi.mock("@/lib/env", () => ({
  getVoiceInterviewEnv: mockGetVoiceInterviewEnv,
}));

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
  OPENAI_VOICE_GROUNDING_TIMEOUT_MS: 15_000,
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

const generalScope: VoiceInterviewScope = {
  evaluationDimensions: ["Concept precision"],
  expectations: ["Stay on topic"],
  questionMap: ["Explain the event loop."],
  questionSummaries: [
    {
      id: "q-1",
      slug: "event-loop",
      summary: "Explain the event loop in plain language.",
      title: "Explain the event loop.",
    },
  ],
  scopeLabel: "Topic scope",
  scopeType: "topic",
  slug: "javascript",
  starterPrompts: ["Start with the event loop."],
  stayInScope: "Stay on JavaScript event loops.",
  summary: "JavaScript runtime behavior",
  title: "JavaScript",
};

const salesforceScope: VoiceInterviewScope = {
  ...generalScope,
  knowledgeDomain: "salesforce",
  questionMap: ["Explain Batch Apex and current state handling."],
  slug: "batch-apex",
  summary: "Salesforce async processing with Batch Apex.",
  title: "Batch Apex",
};

async function importGroundingModule() {
  return await import("@/lib/interview/scoped-documentation-search");
}

describe("scoped documentation grounding", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockGetVoiceInterviewEnv.mockReturnValue(voiceInterviewEnv);
    mockGetServerOpenAiClient.mockReturnValue({
      responses: {
        parse: mockParse,
      },
    });
  });

  it("skips non-Salesforce scopes without calling OpenAI", async () => {
    const { prepareScopedDocumentationGrounding } =
      await importGroundingModule();

    const result = await prepareScopedDocumentationGrounding(generalScope);

    expect(result).toEqual({
      brief: null,
      cacheKey: null,
      durationMs: 0,
      error: null,
      query: null,
      source: "not_applicable",
    });
    expect(mockGetServerOpenAiClient).not.toHaveBeenCalled();
  });

  it("caches a successful Salesforce grounding brief", async () => {
    mockParse.mockResolvedValue({
      output_parsed: {
        evidenceStrength: "strong",
        recentChanges: ["Spring '26 updated Batch Apex retry guidance. 개발"],
        releaseNotes: ["Spring '26 release notes mention the retry update."],
        topicFacts: [
          "Database.Stateful keeps instance state between execute chunks. 개발",
        ],
      },
    });

    const { prepareScopedDocumentationGrounding } =
      await importGroundingModule();

    const first = await prepareScopedDocumentationGrounding(salesforceScope);
    const second = await prepareScopedDocumentationGrounding(salesforceScope);

    expect(first.source).toBe("search");
    expect(first.brief).toEqual(
      expect.objectContaining({
        recentChanges: ["Spring '26 updated Batch Apex retry guidance."],
        scopeSlug: "batch-apex",
        topicFacts: [
          "Database.Stateful keeps instance state between execute chunks.",
        ],
      }),
    );
    expect(second.source).toBe("cache_fresh");
    expect(second.durationMs).toBe(0);
    expect(mockParse).toHaveBeenCalledTimes(1);
    expect(mockParse).toHaveBeenCalledWith(
      expect.objectContaining({
        max_output_tokens: 1_200,
        reasoning: {
          effort: "low",
        },
        text: expect.objectContaining({
          verbosity: "low",
        }),
      }),
      expect.anything(),
    );
  });

  it("captures structured grounding error details when the search request fails", async () => {
    mockParse.mockRejectedValue(
      Object.assign(
        new Error(
          "400 The following tools cannot be used with reasoning.effort 'minimal': web_search.",
        ),
        {
          param: "tools",
          status: 400,
          type: "invalid_request_error",
        },
      ),
    );

    const { prepareScopedDocumentationGrounding } =
      await importGroundingModule();

    const result = await prepareScopedDocumentationGrounding(salesforceScope);

    expect(result).toEqual(
      expect.objectContaining({
        brief: null,
        cacheKey: expect.any(String),
        error: {
          code: null,
          message:
            "400 The following tools cannot be used with reasoning.effort 'minimal': web_search.",
          param: "tools",
          status: 400,
          type: "invalid_request_error",
        },
        query: expect.any(String),
        source: "error",
      }),
    );
  });
});
