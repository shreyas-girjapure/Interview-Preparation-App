import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/voice-interview-sessions", () => ({
  createInterviewSessionRecord: vi.fn(),
  ensureInterviewSessionUserProfile: vi.fn(),
  getBlockingInterviewSessionForUser: vi.fn(),
  LiveInterviewSessionConflictError: class LiveInterviewSessionConflictError extends Error {
    blockingSession: unknown;

    constructor(blockingSession: unknown) {
      super("A live interview session already exists for this user.");
      this.blockingSession = blockingSession;
    }
  },
  markInterviewSessionFailed: vi.fn(),
  markInterviewSessionReady: vi.fn(),
  persistInterviewSessionEvents: vi.fn(),
  VOICE_INTERVIEW_PERSISTENCE_VERSION: "transcript-persistence-v1",
  VOICE_INTERVIEW_PROMPT_VERSION: "voice-prompt-v2-2026-03-10",
  VOICE_INTERVIEW_SEARCH_POLICY_VERSION: "docs-search-v1",
  VOICE_INTERVIEW_TRANSPORT_VERSION: "dual-runtime-v1",
}));

vi.mock("@/lib/interview/voice-scope", () => ({
  resolveVoiceInterviewScope: vi.fn(),
}));

vi.mock("@/lib/interview/scoped-documentation-search", () => ({
  prepareScopedDocumentationGrounding: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getVoiceInterviewEnv: vi.fn(),
}));

vi.mock("@/lib/ai/voice-agent", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/voice-agent")>(
    "@/lib/ai/voice-agent",
  );

  return {
    ...actual,
    createVoiceInterviewBrowserBootstrap: vi.fn(),
  };
});

vi.mock("@/lib/ai/voice-runtimes/chained-voice", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/ai/voice-runtimes/chained-voice")
  >("@/lib/ai/voice-runtimes/chained-voice");

  return {
    ...actual,
    createChainedVoiceOpeningTurn: vi.fn(),
  };
});

import { POST } from "@/app/api/interview/sessions/route";
import {
  VoiceInterviewBootstrapTimeoutError,
  createVoiceInterviewBrowserBootstrap,
} from "@/lib/ai/voice-agent";
import { createChainedVoiceOpeningTurn } from "@/lib/ai/voice-runtimes/chained-voice";
import { getVoiceInterviewEnv } from "@/lib/env";
import { prepareScopedDocumentationGrounding } from "@/lib/interview/scoped-documentation-search";
import {
  createInterviewSessionRecord,
  ensureInterviewSessionUserProfile,
  getBlockingInterviewSessionForUser,
  LiveInterviewSessionConflictError,
  markInterviewSessionFailed,
  markInterviewSessionReady,
  persistInterviewSessionEvents,
} from "@/lib/interview/voice-interview-sessions";
import { resolveVoiceInterviewScope } from "@/lib/interview/voice-scope";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mockedCreateChainedVoiceOpeningTurn = vi.mocked(
  createChainedVoiceOpeningTurn,
);
const mockedCreateVoiceInterviewBrowserBootstrap = vi.mocked(
  createVoiceInterviewBrowserBootstrap,
);
const mockedCreateInterviewSessionRecord = vi.mocked(
  createInterviewSessionRecord,
);
const mockedEnsureInterviewSessionUserProfile = vi.mocked(
  ensureInterviewSessionUserProfile,
);
const mockedGetBlockingInterviewSessionForUser = vi.mocked(
  getBlockingInterviewSessionForUser,
);
const mockedGetVoiceInterviewEnv = vi.mocked(getVoiceInterviewEnv);
const mockedPrepareScopedDocumentationGrounding = vi.mocked(
  prepareScopedDocumentationGrounding,
);
const mockedMarkInterviewSessionFailed = vi.mocked(markInterviewSessionFailed);
const mockedMarkInterviewSessionReady = vi.mocked(markInterviewSessionReady);
const mockedPersistInterviewSessionEvents = vi.mocked(
  persistInterviewSessionEvents,
);
const mockedResolveVoiceInterviewScope = vi.mocked(resolveVoiceInterviewScope);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const sessionId = "11111111-1111-4111-8111-111111111111";

const scope = {
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
  scopeType: "topic" as const,
  slug: "javascript",
  starterPrompts: ["Start with the event loop."],
  stayInScope: "Stay on JavaScript event loops.",
  summary: "JavaScript runtime behavior",
  title: "JavaScript",
};

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
  OPENAI_REALTIME_BOOTSTRAP_TIMEOUT_MS: 20000,
  OPENAI_REALTIME_CLIENT_SECRET_TTL_SECONDS: 600,
  OPENAI_REALTIME_MAX_OUTPUT_TOKENS: 1024,
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

const openingTurn = {
  assistantAudio: {
    base64: "b3BlbmluZy1hdWRpbw==",
    mimeType: "audio/mpeg" as const,
    voice: "marin",
  },
  assistantTranscriptItem: {
    clientSequence: 0,
    finalizedAt: "2026-03-12T10:00:00.000Z",
    itemId: "assistant:opening",
    label: "Interviewer",
    metaLabel: "00:00",
    previousItemId: null,
    source: "server" as const,
    speaker: "assistant" as const,
    text: "Explain the event loop.",
  },
  timingsMs: {
    total: 140,
    tts: 140,
  },
  usageEvents: [
    {
      model: "gpt-4o-mini-tts",
      recordedAt: "2026-03-12T10:00:00.000Z",
      runtimeKind: "chained_voice" as const,
      serviceTier: "standard",
      usage: {
        input_characters: 23,
        output_audio_bytes: 1024,
      },
      usageKey: "server-opening-tts:1",
      usageSource: "server_tts" as const,
    },
  ],
};

function createRequest(body: object) {
  return new Request("http://localhost:3000/api/interview/sessions", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

describe("POST /api/interview/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "user@example.com",
              id: "user-1",
            },
          },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
    mockedGetVoiceInterviewEnv.mockReturnValue(voiceInterviewEnv as never);
    mockedResolveVoiceInterviewScope.mockResolvedValue(scope);
    mockedEnsureInterviewSessionUserProfile.mockResolvedValue(undefined);
    mockedGetBlockingInterviewSessionForUser.mockResolvedValue(null);
    mockedPrepareScopedDocumentationGrounding.mockResolvedValue({
      brief: null,
      cacheKey: null,
      durationMs: 0,
      error: null,
      query: null,
      source: "not_applicable",
    } as never);
    mockedCreateInterviewSessionRecord.mockResolvedValue({
      id: sessionId,
    } as Awaited<ReturnType<typeof createInterviewSessionRecord>>);
    mockedCreateChainedVoiceOpeningTurn.mockResolvedValue(openingTurn as never);
    mockedMarkInterviewSessionReady.mockResolvedValue(undefined);
    mockedMarkInterviewSessionFailed.mockResolvedValue(undefined);
    mockedPersistInterviewSessionEvents.mockResolvedValue({
      costStatus: "pending",
      estimatedCostUsd: null,
      lastClientFlushAt: "2026-03-12T10:00:00.000Z",
      ok: true,
      persistedMessageCount: 1,
      persistedTurnCount: 1,
      recordedEventCount: 0,
      recordedUsageEventCount: 1,
    } as never);
  });

  it("returns the normalized realtime bootstrap payload with diagnostics", async () => {
    mockedCreateVoiceInterviewBrowserBootstrap.mockResolvedValue({
      runtime: {
        kind: "realtime_sts",
        models: {
          realtime: "gpt-realtime",
          transcribe: "gpt-4o-mini-transcribe",
        },
        profileId: "realtime_voice_v1",
        profileVersion: "2026-03-12",
        selectionSource: "auto_policy",
        transport: "realtime_webrtc",
        turnStrategy: "server_vad_full_duplex",
        voice: "marin",
      },
      timingsMs: {
        openAiBootstrap: 182,
        total: 182,
      },
      transport: {
        clientSecret: {
          expiresAt: 1763000000,
          value: "client-secret",
        },
        openAiSessionId: "openai-session-1",
        type: "realtime_webrtc",
      },
    });

    const response = await POST(
      createRequest({
        scopeSlug: scope.slug,
        scopeType: scope.scopeType,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual(
      expect.objectContaining({
        localSession: {
          id: sessionId,
          scopeSlug: "javascript",
          scopeTitle: "JavaScript",
          scopeType: "topic",
        },
        runtime: {
          kind: "realtime_sts",
          models: {
            realtime: "gpt-realtime",
            transcribe: "gpt-4o-mini-transcribe",
          },
          profileId: "realtime_voice_v1",
          profileVersion: "2026-03-12",
          selectionSource: "auto_policy",
          transport: "realtime_webrtc",
          turnStrategy: "server_vad_full_duplex",
          voice: "marin",
        },
        timingsMs: expect.objectContaining({
          localSessionCreate: expect.any(Number),
          markReady: expect.any(Number),
          openAiBootstrap: 182,
          profileSync: expect.any(Number),
          total: expect.any(Number),
        }),
        transport: {
          clientSecret: {
            expiresAt: 1763000000,
            value: "client-secret",
          },
          openAiSessionId: "openai-session-1",
          type: "realtime_webrtc",
        },
      }),
    );
    expect(mockedPersistInterviewSessionEvents).not.toHaveBeenCalled();
    expect(mockedCreateVoiceInterviewBrowserBootstrap).toHaveBeenCalledWith(
      expect.objectContaining({
        groundingBrief: null,
        scope,
      }),
    );
    expect(mockedMarkInterviewSessionReady).toHaveBeenCalledWith(
      expect.objectContaining({
        grounding: expect.objectContaining({
          source: "not_applicable",
        }),
        runtime: expect.objectContaining({
          kind: "realtime_sts",
          selectionSource: "auto_policy",
        }),
        sessionId,
        trace: expect.objectContaining({
          workflowName: "voice-interview-realtime-sts",
        }),
        transport: expect.objectContaining({
          type: "realtime_webrtc",
        }),
      }),
    );
  });

  it("returns chained runtime, transport, and opening turn when the browser supports committed turns", async () => {
    const response = await POST(
      createRequest({
        capabilities: {
          hasAudioContext: true,
          hasMediaRecorder: true,
          supportedMimeTypes: ["audio/webm"],
        },
        runtimePreference: "chained_voice",
        scopeSlug: scope.slug,
        scopeType: scope.scopeType,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual(
      expect.objectContaining({
        openingTurn: {
          assistantAudio: openingTurn.assistantAudio,
          assistantTranscriptItem: openingTurn.assistantTranscriptItem,
          timingsMs: openingTurn.timingsMs,
        },
        runtime: expect.objectContaining({
          kind: "chained_voice",
          models: {
            text: "gpt-5.4",
            transcribe: "gpt-4o-mini-transcribe",
            tts: "gpt-4o-mini-tts",
          },
          selectionSource: "user_preference",
          transport: "server_turns",
          turnStrategy: "client_vad_half_duplex",
          voice: "marin",
        }),
        transport: expect.objectContaining({
          acceptedMimeTypes: expect.arrayContaining(["audio/webm"]),
          autoCommitSilenceMs: 1200,
          maxTurnSeconds: 45,
          playbackFormat: "mp3",
          turnsPath: `/api/interview/sessions/${sessionId}/turns`,
          type: "server_turns",
        }),
      }),
    );
    expect(mockedCreateVoiceInterviewBrowserBootstrap).not.toHaveBeenCalled();
    expect(mockedCreateChainedVoiceOpeningTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        groundingBrief: null,
        profile: expect.objectContaining({
          profileId: "chained_voice_premium",
        }),
        scope,
      }),
    );
    expect(mockedPersistInterviewSessionEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        finalizedItems: [openingTurn.assistantTranscriptItem],
        sessionId,
        usageEvents: openingTurn.usageEvents,
      }),
    );
    expect(mockedMarkInterviewSessionReady).toHaveBeenCalledWith(
      expect.objectContaining({
        grounding: expect.objectContaining({
          source: "not_applicable",
        }),
        runtime: expect.objectContaining({
          kind: "chained_voice",
          selectionSource: "user_preference",
        }),
        transport: expect.objectContaining({
          type: "server_turns",
        }),
      }),
    );
  });

  it("falls back to realtime when chained voice is requested without browser support", async () => {
    mockedCreateVoiceInterviewBrowserBootstrap.mockResolvedValue({
      runtime: {
        kind: "realtime_sts",
        models: {
          realtime: "gpt-realtime",
          transcribe: "gpt-4o-mini-transcribe",
        },
        profileId: "realtime_voice_v1",
        profileVersion: "2026-03-12",
        selectionSource: "auto_policy",
        transport: "realtime_webrtc",
        turnStrategy: "server_vad_full_duplex",
        voice: "marin",
      },
      timingsMs: {
        openAiBootstrap: 182,
        total: 182,
      },
      transport: {
        clientSecret: {
          expiresAt: 1763000000,
          value: "client-secret",
        },
        openAiSessionId: "openai-session-1",
        type: "realtime_webrtc",
      },
    });

    const response = await POST(
      createRequest({
        capabilities: {
          hasAudioContext: false,
          hasMediaRecorder: true,
          supportedMimeTypes: ["audio/webm"],
        },
        runtimePreference: "chained_voice",
        scopeSlug: scope.slug,
        scopeType: scope.scopeType,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.openingTurn).toBeUndefined();
    expect(body.runtime).toEqual(
      expect.objectContaining({
        kind: "realtime_sts",
        selectionSource: "fallback",
      }),
    );
    expect(body.transport).toEqual(
      expect.objectContaining({
        type: "realtime_webrtc",
      }),
    );
    expect(mockedCreateChainedVoiceOpeningTurn).not.toHaveBeenCalled();
  });

  it("returns a timeout error when the OpenAI bootstrap stalls", async () => {
    mockedCreateVoiceInterviewBrowserBootstrap.mockRejectedValue(
      new VoiceInterviewBootstrapTimeoutError(10000),
    );

    const response = await POST(
      createRequest({
        scopeSlug: scope.slug,
        scopeType: scope.scopeType,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body).toEqual({
      error:
        "Voice interview bootstrap timed out before the realtime session was ready.",
      errorCode: "openai_bootstrap_timeout",
    });
    expect(mockedMarkInterviewSessionFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "openai_bootstrap_timeout",
        sessionId,
      }),
    );
  });

  it("returns 409 with blocking session metadata when an active live session exists", async () => {
    mockedGetBlockingInterviewSessionForUser.mockResolvedValue({
      id: "session-existing",
      scopeSlug: "javascript",
      scopeTitle: "JavaScript",
      scopeType: "topic",
      staleAt: "2026-03-10T12:00:00.000Z",
      startedAt: "2026-03-10T11:45:00.000Z",
      state: "active",
    });

    const response = await POST(
      createRequest({
        scopeSlug: scope.slug,
        scopeType: scope.scopeType,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual(
      expect.objectContaining({
        blockingSession: expect.objectContaining({
          id: "session-existing",
          state: "active",
        }),
        errorCode: "live_session_exists",
      }),
    );
    expect(mockedCreateInterviewSessionRecord).not.toHaveBeenCalled();
  });

  it("returns 409 on a create-time live-session race conflict", async () => {
    mockedGetBlockingInterviewSessionForUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "session-race",
        scopeSlug: "javascript",
        scopeTitle: "JavaScript",
        scopeType: "topic",
        staleAt: "2026-03-10T12:00:00.000Z",
        startedAt: "2026-03-10T11:55:00.000Z",
        state: "ready",
      });
    mockedCreateInterviewSessionRecord.mockRejectedValue(
      new LiveInterviewSessionConflictError(null),
    );

    const response = await POST(
      createRequest({
        scopeSlug: scope.slug,
        scopeType: scope.scopeType,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual(
      expect.objectContaining({
        blockingSession: expect.objectContaining({
          id: "session-race",
          state: "ready",
        }),
        errorCode: "live_session_exists",
      }),
    );
  });

  it("returns 400 for an invalid scope slug", async () => {
    const response = await POST(
      createRequest({
        scopeSlug: "not a slug",
        scopeType: scope.scopeType,
      }),
    );

    expect(response.status).toBe(400);
  });
});
