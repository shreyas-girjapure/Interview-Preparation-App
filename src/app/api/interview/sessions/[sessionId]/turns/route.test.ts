import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/voice-runtimes/chained-voice", () => ({
  buildChainedVoiceTranscriptItems: vi.fn(),
  executeChainedVoiceTurn: vi.fn(),
  getDefaultChainedVoiceRuntimeProfile: vi.fn(),
  listChainedVoiceRuntimeProfiles: vi.fn(),
  supportsChainedVoiceMimeType: vi.fn(),
}));

vi.mock("@/lib/interview/voice-interview-sessions", () => ({
  getInterviewSessionRuntimeContext: vi.fn(),
  InterviewSessionNotFoundError: class InterviewSessionNotFoundError extends Error {},
  InterviewSessionTerminalStateConflictError: class InterviewSessionTerminalStateConflictError extends Error {
    constructor(state: string) {
      super(`Interview session is already terminal with state ${state}.`);
    }
  },
  persistInterviewSessionEvents: vi.fn(),
  updateInterviewSessionState: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { POST } from "@/app/api/interview/sessions/[sessionId]/turns/route";
import {
  buildChainedVoiceTranscriptItems,
  executeChainedVoiceTurn,
  getDefaultChainedVoiceRuntimeProfile,
  listChainedVoiceRuntimeProfiles,
  supportsChainedVoiceMimeType,
} from "@/lib/ai/voice-runtimes/chained-voice";
import {
  getInterviewSessionRuntimeContext,
  persistInterviewSessionEvents,
  updateInterviewSessionState,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mockedBuildChainedVoiceTranscriptItems = vi.mocked(
  buildChainedVoiceTranscriptItems,
);
const mockedExecuteChainedVoiceTurn = vi.mocked(executeChainedVoiceTurn);
const mockedGetDefaultChainedVoiceRuntimeProfile = vi.mocked(
  getDefaultChainedVoiceRuntimeProfile,
);
const mockedGetInterviewSessionRuntimeContext = vi.mocked(
  getInterviewSessionRuntimeContext,
);
const mockedListChainedVoiceRuntimeProfiles = vi.mocked(
  listChainedVoiceRuntimeProfiles,
);
const mockedPersistInterviewSessionEvents = vi.mocked(
  persistInterviewSessionEvents,
);
const mockedSupportsChainedVoiceMimeType = vi.mocked(
  supportsChainedVoiceMimeType,
);
const mockedUpdateInterviewSessionState = vi.mocked(
  updateInterviewSessionState,
);
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

const profile = {
  acceptedMimeTypes: ["audio/webm", "audio/webm;codecs=opus"],
  autoCommitSilenceMs: 1200,
  maxTurnSeconds: 45,
  openingMaxOutputTokens: 220,
  playbackFormat: "mp3" as const,
  profileId: "chained_voice_premium" as const,
  profileVersion: "2026-03-12",
  reasoningEffort: "low" as const,
  replyMaxOutputTokens: 420,
  textModel: "gpt-5.4",
  transcribeModel: "gpt-4o-mini-transcribe",
  ttsModel: "gpt-4o-mini-tts",
  voice: "marin",
};

const transcriptItems = {
  assistantTranscriptItem: {
    clientSequence: 2,
    finalizedAt: "2026-03-10T09:00:05.000Z",
    itemId: "assistant:turn-1",
    label: "Interviewer",
    metaLabel: "00:05",
    previousItemId: "turn-1",
    source: "server" as const,
    speaker: "assistant" as const,
    text: "Tell me more about the event loop under load.",
  },
  userTranscriptItem: {
    clientSequence: 1,
    finalizedAt: "2026-03-10T09:00:05.000Z",
    itemId: "turn-1",
    label: "You",
    metaLabel: "00:05",
    previousItemId: "assistant-0",
    source: "server" as const,
    speaker: "user" as const,
    text: "It coordinates queued work after the call stack clears.",
  },
};

function createRequest({
  audio,
  clientTurnId,
  mimeType,
}: {
  audio?: File;
  clientTurnId?: string;
  mimeType?: string;
}) {
  const formData = new FormData();

  if (audio) {
    formData.append("audio", audio);
  }

  if (typeof clientTurnId === "string") {
    formData.append("clientTurnId", clientTurnId);
  }

  if (typeof mimeType === "string") {
    formData.append("mimeType", mimeType);
  }

  return new Request(
    `http://localhost:3000/api/interview/sessions/${sessionId}/turns`,
    {
      body: formData,
      method: "POST",
    },
  );
}

function createRouteContext() {
  return {
    params: Promise.resolve({
      sessionId,
    }),
  };
}

describe("POST /api/interview/sessions/[sessionId]/turns", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
            },
          },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
    mockedGetDefaultChainedVoiceRuntimeProfile.mockReturnValue(
      profile as never,
    );
    mockedListChainedVoiceRuntimeProfiles.mockReturnValue({
      chained_voice_balanced: {
        ...profile,
        profileId: "chained_voice_balanced",
        reasoningEffort: undefined,
        textModel: "gpt-5.2",
      },
      chained_voice_premium: profile,
    } as never);
    mockedSupportsChainedVoiceMimeType.mockReturnValue(true);
    mockedGetInterviewSessionRuntimeContext.mockResolvedValue({
      grounding: {
        recentChanges: ["Spring '26 adjusted Flow error handling guidance."],
        releaseNotes: [
          "Spring '26 release notes mention Flow runtime updates.",
        ],
        retrievedAt: "2026-03-10T08:59:00.000Z",
        scopeSlug: "javascript",
        scopeTitle: "JavaScript",
        topicFacts: ["Keep the active scope narrow during follow-up turns."],
      },
      runtimeKind: "chained_voice",
      runtimeProfileId: "chained_voice_premium",
      runtimeProfileVersion: "2026-03-12",
      scope,
      session: {
        state: "ready",
      },
      startedAt: "2026-03-10T09:00:00.000Z",
      transcriptRows: [
        {
          citations_json: null,
          client_sequence: 0,
          content_text: "Explain the event loop.",
          created_at: "2026-03-10T09:00:00.000Z",
          finalized_at: "2026-03-10T09:00:00.000Z",
          id: "message-1",
          item_id: "assistant-0",
          label: "Interviewer",
          meta_label: "00:00",
          previous_item_id: null,
          session_id: sessionId,
          source: "system",
          speaker: "assistant",
          tone: "default",
          updated_at: "2026-03-10T09:00:00.000Z",
        },
      ],
    } as never);
    mockedUpdateInterviewSessionState.mockResolvedValue(undefined);
    mockedExecuteChainedVoiceTurn.mockResolvedValue({
      assistantAudioBase64: "c29tZS1hdWRpby1ieXRlcw==",
      assistantText: transcriptItems.assistantTranscriptItem.text,
      timingsMs: {
        text: 85,
        total: 305,
        transcription: 120,
        tts: 100,
      },
      usageEvents: [
        {
          model: "gpt-5.4",
          recordedAt: "2026-03-10T09:00:05.000Z",
          runtimeKind: "chained_voice",
          serviceTier: "standard",
          usage: {
            input_tokens: 200,
            output_text_tokens: 80,
            total_tokens: 280,
          },
          usageKey: "server-text-response:resp_1",
          usageSource: "server_text_response",
        },
      ],
      userTranscript: transcriptItems.userTranscriptItem.text,
    } as never);
    mockedBuildChainedVoiceTranscriptItems.mockReturnValue(transcriptItems);
    mockedPersistInterviewSessionEvents.mockResolvedValue({
      costStatus: "pending",
      estimatedCostUsd: null,
      lastClientFlushAt: "2026-03-10T09:00:05.000Z",
      ok: true,
      persistedMessageCount: 3,
      persistedTurnCount: 2,
      recordedEventCount: 1,
      recordedUsageEventCount: 1,
    } as never);
  });

  it("executes a chained voice turn and persists transcript plus usage", async () => {
    const response = await POST(
      createRequest({
        audio: new File(["audio"], "turn.webm", { type: "audio/webm" }),
        clientTurnId: "turn-1",
        mimeType: "audio/webm",
      }),
      createRouteContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        assistantAudio: {
          base64: "c29tZS1hdWRpby1ieXRlcw==",
          mimeType: "audio/mpeg",
          voice: "marin",
        },
        assistantTranscriptItem: transcriptItems.assistantTranscriptItem,
        ok: true,
        runtimeKind: "chained_voice",
        timingsMs: expect.objectContaining({
          text: 85,
          total: expect.any(Number),
          transcription: 120,
          tts: 100,
        }),
        usageEvents: expect.arrayContaining([
          expect.objectContaining({
            usageKey: "server-text-response:resp_1",
          }),
        ]),
        userTranscriptItem: transcriptItems.userTranscriptItem,
      }),
    );
    expect(mockedUpdateInterviewSessionState).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        state: "active",
      }),
    );
    expect(mockedExecuteChainedVoiceTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        groundingBrief: expect.objectContaining({
          retrievedAt: "2026-03-10T08:59:00.000Z",
        }),
        profile,
        scope,
      }),
    );
    expect(mockedPersistInterviewSessionEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        finalizedItems: [
          transcriptItems.userTranscriptItem,
          transcriptItems.assistantTranscriptItem,
        ],
        sessionId,
        usageEvents: expect.arrayContaining([
          expect.objectContaining({
            usageSource: "server_text_response",
          }),
        ]),
      }),
    );
  });

  it("returns 409 when the session is not running the chained lane", async () => {
    mockedGetInterviewSessionRuntimeContext.mockResolvedValue({
      grounding: null,
      runtimeKind: "realtime_sts",
      runtimeProfileId: "realtime_voice_v1",
      runtimeProfileVersion: "2026-03-12",
      scope,
      session: {
        state: "active",
      },
      startedAt: "2026-03-10T09:00:00.000Z",
      transcriptRows: [],
    } as never);

    const response = await POST(
      createRequest({
        audio: new File(["audio"], "turn.webm", { type: "audio/webm" }),
        clientTurnId: "turn-1",
        mimeType: "audio/webm",
      }),
      createRouteContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "This interview session is not running the chained voice lane.",
    });
    expect(mockedExecuteChainedVoiceTurn).not.toHaveBeenCalled();
  });

  it("returns 400 when the committed audio format is unsupported", async () => {
    mockedSupportsChainedVoiceMimeType.mockReturnValue(false);

    const response = await POST(
      createRequest({
        audio: new File(["audio"], "turn.mp4", { type: "audio/mp4" }),
        clientTurnId: "turn-1",
        mimeType: "audio/mp4",
      }),
      createRouteContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error:
        "The committed audio format is not supported for chained voice turns.",
    });
  });

  it("returns 400 when the committed audio payload is missing", async () => {
    const response = await POST(
      createRequest({
        clientTurnId: "turn-1",
        mimeType: "audio/webm",
      }),
      createRouteContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "A committed audio turn is required.",
    });
  });
});
