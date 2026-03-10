import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/voice-interview-persistence", () => ({
  getInterviewMessageCounts: vi.fn(),
  listInterviewMessages: vi.fn(),
  upsertInterviewMessages: vi.fn(),
}));

vi.mock("@/lib/interview/voice-interview-debrief", () => ({
  buildVoiceInterviewDebrief: vi.fn(),
}));

import { buildVoiceInterviewDebrief } from "@/lib/interview/voice-interview-debrief";
import {
  getInterviewMessageCounts,
  upsertInterviewMessages,
} from "@/lib/interview/voice-interview-persistence";
import {
  cancelInterviewSession,
  completeInterviewSession,
  forceEndInterviewSession,
  getBlockingInterviewSessionForUser,
  recordInterviewSessionHeartbeat,
} from "@/lib/interview/voice-interview-sessions";

const mockedBuildVoiceInterviewDebrief = vi.mocked(buildVoiceInterviewDebrief);
const mockedGetInterviewMessageCounts = vi.mocked(getInterviewMessageCounts);
const mockedUpsertInterviewMessages = vi.mocked(upsertInterviewMessages);

function createSessionRow(
  state:
    | "bootstrapping"
    | "ready"
    | "active"
    | "completed"
    | "cancelled"
    | "failed",
  overrides: Record<string, unknown> = {},
) {
  return {
    completion_reason: state === "completed" ? "user_end" : "retry",
    created_at: "2026-03-10T10:00:00.000Z",
    debrief_error_code: null,
    debrief_generated_at:
      state === "completed" ? "2026-03-10T10:30:00.000Z" : null,
    debrief_json:
      state === "completed"
        ? {
            nextDrill: "Run one more round.",
            sharpen: "Tighten tradeoff analysis.",
            strengths: "Stayed inside scope.",
            summary: "Strong scoped interview.",
          }
        : null,
    debrief_status: state === "completed" ? "ready" : "pending",
    ended_at: "2026-03-10T10:35:00.000Z",
    forced_end_at: null,
    forced_end_reason: null,
    id: "session-1",
    last_client_heartbeat_at: null,
    last_client_flush_at: null,
    last_error_code: null,
    last_error_message: null,
    metrics_json: null,
    openai_client_secret_expires_at: null,
    openai_model: "gpt-realtime",
    openai_session_id: "openai-session-1",
    openai_transcription_model: "gpt-4o-mini-transcribe",
    openai_voice: "marin",
    persisted_turn_count: 0,
    runtime_persistence_version: "transcript-persistence-v1",
    runtime_prompt_version: "voice-prompt-v2-2026-03-10",
    runtime_search_policy_version: "docs-search-v1",
    runtime_transport_version: "agents-webrtc-v1",
    scope_slug: "javascript",
    scope_snapshot: {
      evaluationDimensions: [],
      expectations: [],
      questionMap: [],
      questionSummaries: [],
      scopeLabel: "Topic scope",
      scopeType: "topic",
      slug: "javascript",
      starterPrompts: [],
      stayInScope: "Stay in scope.",
      summary: "JavaScript scope",
      title: "JavaScript",
    },
    scope_title: "JavaScript",
    scope_type: "topic",
    stale_at: null,
    started_at: "2026-03-10T10:01:00.000Z",
    state,
    updated_at: "2026-03-10T10:40:00.000Z",
    user_id: "user-1",
    ...overrides,
  };
}

function createSupabaseMock(state: "completed" | "cancelled" | "failed") {
  const updateCalls: Array<Record<string, unknown>> = [];
  const maybeSingle = vi.fn().mockResolvedValue({
    data: createSessionRow(state),
    error: null,
  });
  const selectEq = vi.fn().mockReturnValue({
    maybeSingle,
  });
  const select = vi.fn().mockReturnValue({
    eq: selectEq,
  });
  const updateEq = vi.fn().mockResolvedValue({
    error: null,
  });
  const update = vi.fn((payload: Record<string, unknown>) => {
    updateCalls.push(payload);

    return {
      eq: updateEq,
    };
  });

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table !== "interview_sessions") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select,
          update,
        };
      }),
    },
    updateCalls,
  };
}

describe("voice interview sessions idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpsertInterviewMessages.mockResolvedValue(0);
    mockedGetInterviewMessageCounts.mockResolvedValue({
      persistedMessageCount: 4,
      persistedTurnCount: 3,
    });
  });

  it("treats duplicate complete requests on already completed sessions as idempotent", async () => {
    const { supabase, updateCalls } = createSupabaseMock("completed");

    const result = await completeInterviewSession({
      completionReason: "user_end",
      finalizedItems: [],
      metrics: {
        assistantTurnCount: 2,
        elapsedSeconds: 60,
        finalizedTurnCount: 4,
        persistedMessageCount: 4,
        searchTurnCount: 0,
        userTurnCount: 2,
      },
      sessionId: "session-1",
      supabase: supabase as never,
    });

    expect(result).toEqual({
      debrief: {
        nextDrill: "Run one more round.",
        sharpen: "Tighten tradeoff analysis.",
        strengths: "Stayed inside scope.",
        summary: "Strong scoped interview.",
      },
      debriefErrorCode: null,
      debriefStatus: "ready",
      ok: true,
      persistedMessageCount: 4,
      persistedTurnCount: 3,
    });
    expect(mockedBuildVoiceInterviewDebrief).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toEqual(
      expect.objectContaining({
        persisted_turn_count: 3,
      }),
    );
  });

  it("returns existing terminal state for duplicate cancel requests", async () => {
    const { supabase, updateCalls } = createSupabaseMock("completed");

    const result = await cancelInterviewSession({
      finalizedItems: [],
      reason: "retry",
      sessionId: "session-1",
      supabase: supabase as never,
    });

    expect(result).toEqual({
      ok: true,
      persistedMessageCount: 4,
      persistedTurnCount: 3,
      state: "completed",
    });
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].state).toBeUndefined();
  });
});

describe("voice interview session policy", () => {
  it("returns a blocking live session when it is not stale", async () => {
    const activeRow = createSessionRow("active", {
      last_client_heartbeat_at: new Date(Date.now() - 60_000).toISOString(),
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: activeRow,
      error: null,
    });
    const limit = vi.fn().mockResolvedValue({
      data: [activeRow],
      error: null,
    });
    const order = vi.fn().mockReturnValue({
      limit,
    });
    const inFn = vi.fn().mockReturnValue({
      order,
    });
    const eqFn = vi.fn((column: string) => {
      if (column === "user_id") {
        return {
          in: inFn,
        };
      }

      return {
        maybeSingle,
      };
    });
    const update = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: eqFn,
        }),
        update,
      })),
    };

    const blocking = await getBlockingInterviewSessionForUser({
      supabase: supabase as never,
      userId: "user-1",
    });

    expect(blocking).toEqual(
      expect.objectContaining({
        id: "session-1",
        scopeSlug: "javascript",
        state: "active",
      }),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("reclaims stale blocking sessions and allows new bootstrap", async () => {
    const staleReadyRow = createSessionRow("ready", {
      created_at: "2026-03-10T08:00:00.000Z",
      started_at: "2026-03-10T08:01:00.000Z",
      updated_at: "2026-03-10T08:10:00.000Z",
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: staleReadyRow,
      error: null,
    });
    const limit = vi.fn().mockResolvedValue({
      data: [staleReadyRow],
      error: null,
    });
    const order = vi.fn().mockReturnValue({
      limit,
    });
    const inFn = vi.fn().mockReturnValue({
      order,
    });
    const eqFn = vi.fn((column: string) => {
      if (column === "user_id") {
        return {
          in: inFn,
        };
      }

      return {
        maybeSingle,
      };
    });
    const updateMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        forced_end_at: "2026-03-10T12:00:00.000Z",
        forced_end_reason: "stale_session",
        state: "cancelled",
      },
      error: null,
    });
    const updateSelect = vi.fn().mockReturnValue({
      maybeSingle: updateMaybeSingle,
    });
    const updateIn = vi.fn().mockReturnValue({
      select: updateSelect,
    });
    const updateEq = vi.fn().mockReturnValue({
      in: updateIn,
      select: updateSelect,
    });
    const update = vi.fn().mockReturnValue({
      eq: updateEq,
    });
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: eqFn,
        }),
        update,
      })),
    };

    const blocking = await getBlockingInterviewSessionForUser({
      supabase: supabase as never,
      userId: "user-1",
    });

    expect(blocking).toBeNull();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        forced_end_reason: "stale_session",
        state: "cancelled",
      }),
    );
  });

  it("force-ends active sessions with an auditable reason", async () => {
    const activeRow = createSessionRow("active");
    const maybeSingle = vi.fn().mockResolvedValue({
      data: activeRow,
      error: null,
    });
    const updateMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        forced_end_at: "2026-03-10T12:00:00.000Z",
        forced_end_reason: "policy_update",
        state: "cancelled",
      },
      error: null,
    });
    const updateSelect = vi.fn().mockReturnValue({
      maybeSingle: updateMaybeSingle,
    });
    const updateEq = vi.fn().mockReturnValue({
      select: updateSelect,
    });
    const update = vi.fn().mockReturnValue({
      eq: updateEq,
    });
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle,
          }),
        }),
        update,
      })),
    };

    const result = await forceEndInterviewSession({
      reason: "policy_update",
      sessionId: "session-1",
      supabase: supabase as never,
    });

    expect(result).toEqual({
      forcedEndAt: "2026-03-10T12:00:00.000Z",
      forcedEndReason: "policy_update",
      ok: true,
      state: "cancelled",
    });
  });

  it("updates heartbeat timestamp for active sessions", async () => {
    const activeRow = createSessionRow("active");
    const maybeSingle = vi.fn().mockResolvedValue({
      data: activeRow,
      error: null,
    });
    const heartbeatSelectMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        last_client_heartbeat_at: "2026-03-10T12:10:00.000Z",
        state: "active",
      },
      error: null,
    });
    const heartbeatSelect = vi.fn().mockReturnValue({
      maybeSingle: heartbeatSelectMaybeSingle,
    });
    const heartbeatEqState = vi.fn().mockReturnValue({
      select: heartbeatSelect,
    });
    const heartbeatEqId = vi.fn().mockReturnValue({
      eq: heartbeatEqState,
    });
    const update = vi.fn().mockReturnValue({
      eq: heartbeatEqId,
    });
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle,
          }),
        }),
        update,
      })),
    };

    const result = await recordInterviewSessionHeartbeat({
      sessionId: "session-1",
      supabase: supabase as never,
    });

    expect(result).toEqual({
      lastClientHeartbeatAt: "2026-03-10T12:10:00.000Z",
      ok: true,
      state: "active",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_client_heartbeat_at: expect.any(String),
      }),
    );
  });
});
