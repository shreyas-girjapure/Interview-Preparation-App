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
}));

vi.mock("@/lib/interview/voice-scope", () => ({
  resolveVoiceInterviewScope: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
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

import { POST } from "@/app/api/interview/sessions/route";
import {
  VoiceInterviewBootstrapTimeoutError,
  createVoiceInterviewBrowserBootstrap,
} from "@/lib/ai/voice-agent";
import {
  createInterviewSessionRecord,
  ensureInterviewSessionUserProfile,
  getBlockingInterviewSessionForUser,
  LiveInterviewSessionConflictError,
  markInterviewSessionFailed,
  markInterviewSessionReady,
} from "@/lib/interview/voice-interview-sessions";
import { resolveVoiceInterviewScope } from "@/lib/interview/voice-scope";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
const mockedMarkInterviewSessionFailed = vi.mocked(markInterviewSessionFailed);
const mockedMarkInterviewSessionReady = vi.mocked(markInterviewSessionReady);
const mockedResolveVoiceInterviewScope = vi.mocked(resolveVoiceInterviewScope);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

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
    mockedResolveVoiceInterviewScope.mockResolvedValue(scope);
    mockedEnsureInterviewSessionUserProfile.mockResolvedValue(undefined);
    mockedGetBlockingInterviewSessionForUser.mockResolvedValue(null);
    mockedCreateInterviewSessionRecord.mockResolvedValue({
      id: "session-1",
    } as Awaited<ReturnType<typeof createInterviewSessionRecord>>);
    mockedMarkInterviewSessionReady.mockResolvedValue(undefined);
    mockedMarkInterviewSessionFailed.mockResolvedValue(undefined);
  });

  it("returns the realtime bootstrap payload with diagnostics", async () => {
    mockedCreateVoiceInterviewBrowserBootstrap.mockResolvedValue({
      clientSecret: {
        expiresAt: 1_763_000_000,
        value: "client-secret",
      },
      realtime: {
        model: "gpt-realtime",
        openAiSessionId: "openai-session-1",
        transcriptionModel: "gpt-4o-mini-transcribe",
        voice: "marin",
      },
      timingsMs: {
        openAiBootstrap: 182,
        total: 182,
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
        clientSecret: {
          expiresAt: 1_763_000_000,
          value: "client-secret",
        },
        localSession: {
          id: "session-1",
          scopeSlug: "javascript",
          scopeTitle: "JavaScript",
          scopeType: "topic",
        },
        realtime: {
          model: "gpt-realtime",
          openAiSessionId: "openai-session-1",
          transcriptionModel: "gpt-4o-mini-transcribe",
          voice: "marin",
        },
        timingsMs: expect.objectContaining({
          localSessionCreate: expect.any(Number),
          markReady: expect.any(Number),
          openAiBootstrap: 182,
          profileSync: expect.any(Number),
          total: expect.any(Number),
        }),
      }),
    );
    expect(mockedMarkInterviewSessionReady).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-realtime",
        sessionId: "session-1",
        transcriptionModel: "gpt-4o-mini-transcribe",
        voice: "marin",
      }),
    );
  });

  it("returns a timeout error when the OpenAI bootstrap stalls", async () => {
    mockedCreateVoiceInterviewBrowserBootstrap.mockRejectedValue(
      new VoiceInterviewBootstrapTimeoutError(10_000),
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
        sessionId: "session-1",
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
});
