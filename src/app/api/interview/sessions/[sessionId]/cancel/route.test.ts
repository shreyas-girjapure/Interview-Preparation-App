import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/voice-interview-sessions", () => ({
  cancelInterviewSession: vi.fn(),
  InterviewSessionNotFoundError: class InterviewSessionNotFoundError extends Error {},
  InterviewSessionTerminalStateConflictError: class InterviewSessionTerminalStateConflictError extends Error {},
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { POST } from "@/app/api/interview/sessions/[sessionId]/cancel/route";
import {
  cancelInterviewSession,
  InterviewSessionNotFoundError,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mockedCancelInterviewSession = vi.mocked(cancelInterviewSession);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const sessionId = "11111111-1111-4111-8111-111111111111";

function createRequest(body: object) {
  return new Request(
    `http://localhost:3000/api/interview/sessions/${sessionId}/cancel`,
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

describe("POST /api/interview/sessions/[sessionId]/cancel", () => {
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
    mockedCancelInterviewSession.mockResolvedValue({
      ok: true,
      persistedMessageCount: 3,
      persistedTurnCount: 2,
      state: "cancelled",
    });
  });

  it("cancels the session and optionally persists finalized transcript items", async () => {
    const response = await POST(
      createRequest({
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
        reason: "user_exit",
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
      persistedMessageCount: 3,
      persistedTurnCount: 2,
      state: "cancelled",
    });
    expect(mockedCancelInterviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "user_exit",
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
        reason: "retry",
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
    mockedCancelInterviewSession.mockRejectedValue(
      new InterviewSessionNotFoundError(sessionId),
    );

    const response = await POST(
      createRequest({
        reason: "setup_abort",
      }),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(404);
  });
});
