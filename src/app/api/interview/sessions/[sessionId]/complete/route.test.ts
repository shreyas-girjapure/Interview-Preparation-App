import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/voice-interview-sessions", () => ({
  completeInterviewSession: vi.fn(),
  InterviewSessionNotFoundError: class InterviewSessionNotFoundError extends Error {},
  InterviewSessionTerminalStateConflictError: class InterviewSessionTerminalStateConflictError extends Error {
    constructor(state: string) {
      super(`Interview session is already terminal with state ${state}.`);
    }
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { POST } from "@/app/api/interview/sessions/[sessionId]/complete/route";
import {
  completeInterviewSession,
  InterviewSessionNotFoundError,
  InterviewSessionTerminalStateConflictError,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mockedCompleteInterviewSession = vi.mocked(completeInterviewSession);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const sessionId = "11111111-1111-4111-8111-111111111111";

function createRequest(body: object) {
  return new Request(
    `http://localhost:3000/api/interview/sessions/${sessionId}/complete`,
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

describe("POST /api/interview/sessions/[sessionId]/complete", () => {
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
    mockedCompleteInterviewSession.mockResolvedValue({
      debrief: {
        nextDrill: "Run one more timed round.",
        sharpen: "Be more concise.",
        strengths: "Stayed on scope.",
        summary: "Good interview run.",
      },
      debriefStatus: "ready",
      ok: true,
      persistedMessageCount: 4,
      persistedTurnCount: 3,
    });
  });

  it("completes the session and returns server debrief", async () => {
    const response = await POST(
      createRequest({
        completionReason: "user_end",
        finalizedItems: [
          {
            clientSequence: 0,
            finalizedAt: "2026-03-10T09:00:00.000Z",
            itemId: "assistant-1",
            label: "Interviewer",
            metaLabel: "00:04",
            source: "realtime",
            speaker: "assistant",
            text: "Explain event loops.",
          },
        ],
        metrics: {
          assistantTurnCount: 2,
          elapsedSeconds: 120,
          finalizedTurnCount: 4,
          persistedMessageCount: 4,
          searchTurnCount: 0,
          userTurnCount: 2,
        },
      }),
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
        debriefStatus: "ready",
        ok: true,
      }),
    );
    expect(mockedCompleteInterviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
      }),
    );
  });

  it("returns 400 for an invalid payload", async () => {
    const response = await POST(createRequest({}), {
      params: Promise.resolve({
        sessionId,
      }),
    });

    expect(response.status).toBe(400);
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

    const response = await POST(
      createRequest({
        completionReason: "user_end",
        finalizedItems: [],
        metrics: {
          assistantTurnCount: 0,
          elapsedSeconds: 0,
          finalizedTurnCount: 0,
          persistedMessageCount: 0,
          searchTurnCount: 0,
          userTurnCount: 0,
        },
      }),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the session record is missing", async () => {
    mockedCompleteInterviewSession.mockRejectedValue(
      new InterviewSessionNotFoundError(sessionId),
    );

    const response = await POST(
      createRequest({
        completionReason: "user_end",
        finalizedItems: [],
        metrics: {
          assistantTurnCount: 0,
          elapsedSeconds: 0,
          finalizedTurnCount: 0,
          persistedMessageCount: 0,
          searchTurnCount: 0,
          userTurnCount: 0,
        },
      }),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("returns 409 for an already terminal session", async () => {
    mockedCompleteInterviewSession.mockRejectedValue(
      new InterviewSessionTerminalStateConflictError("failed"),
    );

    const response = await POST(
      createRequest({
        completionReason: "user_end",
        finalizedItems: [],
        metrics: {
          assistantTurnCount: 0,
          elapsedSeconds: 0,
          finalizedTurnCount: 0,
          persistedMessageCount: 0,
          searchTurnCount: 0,
          userTurnCount: 0,
        },
      }),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(409);
  });
});
