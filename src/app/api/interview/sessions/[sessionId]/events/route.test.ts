import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/voice-interview-sessions", () => ({
  InterviewSessionNotFoundError: class InterviewSessionNotFoundError extends Error {},
  persistInterviewSessionEvents: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { POST } from "@/app/api/interview/sessions/[sessionId]/events/route";
import {
  InterviewSessionNotFoundError,
  persistInterviewSessionEvents,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mockedPersistInterviewSessionEvents = vi.mocked(
  persistInterviewSessionEvents,
);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

function createRequest(body: object) {
  return new Request(
    "http://localhost:3000/api/interview/sessions/session-1/events",
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

describe("POST /api/interview/sessions/[sessionId]/events", () => {
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
    mockedPersistInterviewSessionEvents.mockResolvedValue({
      lastClientFlushAt: "2026-03-10T10:00:00.000Z",
      ok: true,
      persistedMessageCount: 3,
      persistedTurnCount: 2,
    });
  });

  it("persists finalized transcript events", async () => {
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
      }),
      {
        params: Promise.resolve({
          sessionId: "session-1",
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      lastClientFlushAt: "2026-03-10T10:00:00.000Z",
      ok: true,
      persistedMessageCount: 3,
      persistedTurnCount: 2,
    });
    expect(mockedPersistInterviewSessionEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
      }),
    );
  });

  it("returns 400 for an invalid payload", async () => {
    const response = await POST(createRequest({}), {
      params: Promise.resolve({
        sessionId: "session-1",
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
        finalizedItems: [],
      }),
      {
        params: Promise.resolve({
          sessionId: "session-1",
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the session record is missing", async () => {
    mockedPersistInterviewSessionEvents.mockRejectedValue(
      new InterviewSessionNotFoundError("session-1"),
    );

    const response = await POST(
      createRequest({
        finalizedItems: [],
      }),
      {
        params: Promise.resolve({
          sessionId: "session-1",
        }),
      },
    );

    expect(response.status).toBe(404);
  });
});
