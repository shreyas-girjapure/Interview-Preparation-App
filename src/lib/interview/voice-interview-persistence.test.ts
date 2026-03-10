import { describe, expect, it, vi } from "vitest";

import {
  dedupePersistedTranscriptItems,
  upsertInterviewMessages,
} from "@/lib/interview/voice-interview-persistence";

describe("voice interview persistence helpers", () => {
  it("dedupes by itemId, keeps latest payload, and returns sequence order", () => {
    const items = dedupePersistedTranscriptItems([
      {
        clientSequence: 3,
        finalizedAt: "2026-03-10T11:00:00.000Z",
        itemId: "assistant-1",
        label: "Interviewer",
        metaLabel: "00:03",
        source: "realtime",
        speaker: "assistant",
        text: "first version",
      },
      {
        clientSequence: 2,
        finalizedAt: "2026-03-10T11:00:01.000Z",
        itemId: "assistant-1",
        label: "Interviewer",
        metaLabel: "00:02",
        source: "realtime",
        speaker: "assistant",
        text: "latest version",
      },
      {
        clientSequence: 1,
        finalizedAt: "2026-03-10T11:00:02.000Z",
        itemId: "user-1",
        label: "You",
        metaLabel: "00:01",
        source: "realtime",
        speaker: "user",
        text: "answer",
      },
      {
        clientSequence: 4,
        finalizedAt: "2026-03-10T11:00:03.000Z",
        itemId: "invalid",
        label: "You",
        metaLabel: "00:04",
        source: "realtime",
        speaker: "user",
        text: "   ",
      },
    ]);

    expect(items.map((item) => item.itemId)).toEqual(["user-1", "assistant-1"]);
    expect(items.find((item) => item.itemId === "assistant-1")?.text).toBe(
      "latest version",
    );
  });

  it("upserts re-positioned finalized items across snapshot flushes", async () => {
    const upsert = vi.fn().mockResolvedValue({
      error: null,
    });
    const supabase = {
      from: vi.fn().mockReturnValue({
        upsert,
      }),
    } as unknown as Parameters<typeof upsertInterviewMessages>[0]["supabase"];

    await upsertInterviewMessages({
      finalizedItems: [
        {
          clientSequence: 0,
          finalizedAt: "2026-03-10T11:00:00.000Z",
          itemId: "user-1",
          label: "You",
          metaLabel: "00:01",
          source: "realtime",
          speaker: "user",
          text: "first answer",
        },
        {
          clientSequence: 1,
          finalizedAt: "2026-03-10T11:00:02.000Z",
          itemId: "assistant-1",
          label: "Interviewer",
          metaLabel: "00:02",
          previousItemId: "user-1",
          source: "realtime",
          speaker: "assistant",
          text: "first follow-up",
        },
      ],
      sessionId: "session-1",
      supabase,
    });

    await upsertInterviewMessages({
      finalizedItems: [
        {
          clientSequence: 0,
          finalizedAt: "2026-03-10T11:00:00.000Z",
          itemId: "user-1",
          label: "You",
          metaLabel: "00:01",
          source: "realtime",
          speaker: "user",
          text: "first answer",
        },
        {
          clientSequence: 2,
          finalizedAt: "2026-03-10T11:00:02.000Z",
          itemId: "assistant-1",
          label: "Interviewer",
          metaLabel: "00:02",
          previousItemId: "assistant-0",
          source: "realtime",
          speaker: "assistant",
          text: "first follow-up",
        },
      ],
      sessionId: "session-1",
      supabase,
    });

    const secondCallRows = upsert.mock.calls[1]?.[0] as Array<{
      client_sequence: number;
      item_id: string;
      previous_item_id: string | null;
    }>;
    const assistantRow = secondCallRows.find(
      (row) => row.item_id === "assistant-1",
    );

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(assistantRow).toEqual(
      expect.objectContaining({
        client_sequence: 2,
        previous_item_id: "assistant-0",
      }),
    );
  });
});
