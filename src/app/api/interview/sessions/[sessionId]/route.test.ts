import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/voice-interview-sessions", () => ({
  getInterviewSessionDetail: vi.fn(),
  InterviewSessionNotFoundError: class InterviewSessionNotFoundError extends Error {},
  InterviewSessionTerminalStateConflictError: class InterviewSessionTerminalStateConflictError extends Error {},
  updateInterviewSessionState: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/interview/sessions/[sessionId]/route";
import {
  getInterviewSessionDetail,
  InterviewSessionNotFoundError,
  updateInterviewSessionState,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const mockedGetInterviewSessionDetail = vi.mocked(getInterviewSessionDetail);
const mockedUpdateInterviewSessionState = vi.mocked(
  updateInterviewSessionState,
);
const sessionId = "11111111-1111-4111-8111-111111111111";

function createPatchRequest(body: object) {
  return new Request(
    `http://localhost:3000/api/interview/sessions/${sessionId}`,
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
  );
}

describe("GET/PATCH /api/interview/sessions/[sessionId]", () => {
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
  });

  it("returns persisted session detail for an authenticated user", async () => {
    mockedGetInterviewSessionDetail.mockResolvedValue({
      events: [],
      session: {
        completionReason: null,
        costBreakdown: null,
        costEstimatedAt: null,
        costNotes: null,
        costRateSnapshot: null,
        costStatus: "pending",
        createdAt: "2026-03-10T10:00:00.000Z",
        debrief: null,
        debriefErrorCode: null,
        debriefGeneratedAt: null,
        debriefStatus: "pending",
        diagnostics: null,
        estimatedCostCurrency: "USD",
        estimatedCostUsd: null,
        forcedEndAt: null,
        forcedEndReason: null,
        id: sessionId,
        lastClientHeartbeatAt: null,
        lastClientFlushAt: null,
        lastDisconnectReason: null,
        lastUsageRecordedAt: null,
        metrics: null,
        openAiTraceEnabled: true,
        openAiTraceGroupId: sessionId,
        openAiTraceMetadata: {
          localSessionId: sessionId,
        },
        openAiTraceMode: "structured",
        openAiTraceWorkflowName: "voice-interview-realtime-sts",
        persistedTurnCount: 0,
        retryCount: 0,
        runtimeEnvironment: "test",
        runtimePersistenceVersion: "transcript-persistence-v1",
        runtimePromptVersion: "voice-prompt-v2-2026-03-10",
        runtimeSearchPolicyVersion: "docs-search-v1",
        runtimeTransportVersion: "agents-webrtc-v1",
        scopeSlug: "javascript",
        scopeTitle: "JavaScript",
        scopeType: "topic",
        staleAt: null,
        state: "ready",
        telemetryUpdatedAt: "2026-03-10T10:01:00.000Z",
        updatedAt: "2026-03-10T10:02:00.000Z",
        usageSummary: null,
      },
      transcript: [],
      usageEvents: [],
    });

    const response = await GET(
      new Request(`http://localhost:3000/api/interview/sessions/${sessionId}`),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        session: expect.objectContaining({
          id: sessionId,
          scopeSlug: "javascript",
        }),
      }),
    );
  });

  it("returns 404 when the session detail is not found", async () => {
    mockedGetInterviewSessionDetail.mockRejectedValue(
      new InterviewSessionNotFoundError(sessionId),
    );

    const response = await GET(
      new Request(`http://localhost:3000/api/interview/sessions/${sessionId}`),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 when PATCH payload is invalid", async () => {
    const response = await PATCH(createPatchRequest({}), {
      params: Promise.resolve({
        sessionId,
      }),
    });

    expect(response.status).toBe(400);
  });

  it("updates lightweight session state through PATCH", async () => {
    mockedUpdateInterviewSessionState.mockResolvedValue(undefined);

    const response = await PATCH(
      createPatchRequest({
        state: "active",
      }),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
    });
    expect(mockedUpdateInterviewSessionState).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        state: "active",
      }),
    );
  });

  it("returns 401 when the user is unauthenticated", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const getResponse = await GET(
      new Request(`http://localhost:3000/api/interview/sessions/${sessionId}`),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );
    const patchResponse = await PATCH(
      createPatchRequest({
        state: "active",
      }),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(getResponse.status).toBe(401);
    expect(patchResponse.status).toBe(401);
  });

  it("returns 400 when the session id is invalid", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/interview/sessions/not-a-uuid"),
      {
        params: Promise.resolve({
          sessionId: "not-a-uuid",
        }),
      },
    );

    expect(response.status).toBe(400);
  });
});
