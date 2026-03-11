import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/voice-interview-sessions", () => ({
  InterviewSessionNotFoundError: class InterviewSessionNotFoundError extends Error {},
  InterviewSessionTerminalStateConflictError: class InterviewSessionTerminalStateConflictError extends Error {},
  recordInterviewSessionHeartbeat: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { POST } from "@/app/api/interview/sessions/[sessionId]/heartbeat/route";
import {
  InterviewSessionNotFoundError,
  recordInterviewSessionHeartbeat,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mockedRecordInterviewSessionHeartbeat = vi.mocked(
  recordInterviewSessionHeartbeat,
);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const sessionId = "11111111-1111-4111-8111-111111111111";

describe("POST /api/interview/sessions/[sessionId]/heartbeat", () => {
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
    mockedRecordInterviewSessionHeartbeat.mockResolvedValue({
      lastClientHeartbeatAt: "2026-03-10T12:00:00.000Z",
      ok: true,
      state: "active",
    });
  });

  it("records session heartbeat", async () => {
    const response = await POST(
      new Request(
        `http://localhost:3000/api/interview/sessions/${sessionId}/heartbeat`,
        {
          method: "POST",
        },
      ),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      lastClientHeartbeatAt: "2026-03-10T12:00:00.000Z",
      ok: true,
      state: "active",
    });
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
      new Request(
        `http://localhost:3000/api/interview/sessions/${sessionId}/heartbeat`,
        {
          method: "POST",
        },
      ),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the session is missing", async () => {
    mockedRecordInterviewSessionHeartbeat.mockRejectedValue(
      new InterviewSessionNotFoundError(sessionId),
    );

    const response = await POST(
      new Request(
        `http://localhost:3000/api/interview/sessions/${sessionId}/heartbeat`,
        {
          method: "POST",
        },
      ),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(404);
  });
});
