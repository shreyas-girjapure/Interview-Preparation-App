import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/voice-interview-sessions", () => ({
  forceEndInterviewSession: vi.fn(),
  InterviewSessionNotFoundError: class InterviewSessionNotFoundError extends Error {},
  InterviewSessionTerminalStateConflictError: class InterviewSessionTerminalStateConflictError extends Error {},
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { POST } from "@/app/api/interview/sessions/[sessionId]/force-end/route";
import {
  forceEndInterviewSession,
  InterviewSessionNotFoundError,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mockedForceEndInterviewSession = vi.mocked(forceEndInterviewSession);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const sessionId = "11111111-1111-4111-8111-111111111111";

function createRequest(body: object) {
  return new Request(
    `http://localhost:3000/api/interview/sessions/${sessionId}/force-end`,
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

describe("POST /api/interview/sessions/[sessionId]/force-end", () => {
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
    mockedForceEndInterviewSession.mockResolvedValue({
      forcedEndAt: "2026-03-10T12:00:00.000Z",
      forcedEndReason: "duplicate_session",
      ok: true,
      state: "cancelled",
    });
  });

  it("force ends a session with a client-owned reason", async () => {
    const response = await POST(
      createRequest({
        reason: "duplicate_session",
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
      forcedEndAt: "2026-03-10T12:00:00.000Z",
      forcedEndReason: "duplicate_session",
      ok: true,
      state: "cancelled",
    });
  });

  it("returns 400 for an invalid payload", async () => {
    const response = await POST(createRequest({}), {
      params: Promise.resolve({
        sessionId,
      }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
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
        reason: "duplicate_session",
      }),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when session does not exist", async () => {
    mockedForceEndInterviewSession.mockRejectedValue(
      new InterviewSessionNotFoundError(sessionId),
    );

    const response = await POST(
      createRequest({
        reason: "duplicate_session",
      }),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("rejects server-owned force-end reasons from the client", async () => {
    const response = await POST(
      createRequest({
        reason: "policy_update",
      }),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(400);
  });
});
