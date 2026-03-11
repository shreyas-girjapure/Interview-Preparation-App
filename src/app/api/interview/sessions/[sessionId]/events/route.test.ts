import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/voice-interview-sessions", () => ({
  InterviewSessionNotFoundError: class InterviewSessionNotFoundError extends Error {},
  InterviewSessionTerminalStateConflictError: class InterviewSessionTerminalStateConflictError extends Error {},
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
const sessionId = "11111111-1111-4111-8111-111111111111";

function createRequest(body: object) {
  return new Request(
    `http://localhost:3000/api/interview/sessions/${sessionId}/events`,
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
      costStatus: "pending",
      estimatedCostUsd: null,
      lastClientFlushAt: "2026-03-10T10:00:00.000Z",
      ok: true,
      persistedMessageCount: 3,
      persistedTurnCount: 2,
      recordedEventCount: 0,
      recordedUsageEventCount: 0,
    });
  });

  it("persists transcript, telemetry, and usage payloads together", async () => {
    const response = await POST(
      createRequest({
        events: [
          {
            eventKey: "client-bootstrap-ready",
            eventName: "client_bootstrap_ready",
            eventSource: "client",
            payload: {
              bootstrapMs: 182,
            },
            recordedAt: "2026-03-10T09:00:05.000Z",
          },
        ],
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
        usageEvents: [
          {
            model: "gpt-realtime",
            recordedAt: "2026-03-10T09:00:08.000Z",
            runtimeKind: "realtime_sts",
            serviceTier: "standard",
            usage: {
              input_audio_tokens: 1200,
              output_audio_tokens: 800,
              output_text_tokens: 120,
            },
            usageKey: "response-done-1",
            usageSource: "realtime_response",
          },
        ],
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
      costStatus: "pending",
      estimatedCostUsd: null,
      lastClientFlushAt: "2026-03-10T10:00:00.000Z",
      ok: true,
      persistedMessageCount: 3,
      persistedTurnCount: 2,
      recordedEventCount: 0,
      recordedUsageEventCount: 0,
    });
    expect(mockedPersistInterviewSessionEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            eventKey: "client-bootstrap-ready",
          }),
        ]),
        sessionId,
        usageEvents: expect.arrayContaining([
          expect.objectContaining({
            usageKey: "response-done-1",
          }),
        ]),
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
        finalizedItems: [],
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
    mockedPersistInterviewSessionEvents.mockRejectedValue(
      new InterviewSessionNotFoundError(sessionId),
    );

    const response = await POST(
      createRequest({
        finalizedItems: [],
      }),
      {
        params: Promise.resolve({
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 for malformed citation urls", async () => {
    const response = await POST(
      createRequest({
        finalizedItems: [
          {
            citations: [
              {
                source: "Topic brief",
                url: "not-a-url",
              },
            ],
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
          sessionId,
        }),
      },
    );

    expect(response.status).toBe(400);
  });
});
