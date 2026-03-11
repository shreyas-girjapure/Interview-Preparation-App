import { describe, expect, it } from "vitest";
import type { RealtimeItem } from "@openai/agents/realtime";

import {
  buildVoiceInterviewRuntimeSnapshot,
  buildVoiceInterviewUserTranscriptItem,
  mapRealtimeItemToTranscriptItem,
  upsertVoiceInterviewTranscriptItem,
} from "@/lib/interview/voice-interview-runtime";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

const scope: VoiceInterviewScope = {
  evaluationDimensions: ["Concept precision"],
  expectations: ["Stay on topic"],
  questionMap: ["Explain event loops."],
  questionSummaries: [
    {
      id: "q-1",
      slug: "event-loop",
      summary: "Explain how the event loop schedules work.",
      title: "Explain event loops.",
    },
  ],
  scopeLabel: "Topic scope",
  scopeType: "topic",
  slug: "javascript",
  starterPrompts: ["Start with the event loop"],
  stayInScope: "Stay on JavaScript event loops.",
  summary: "JavaScript runtime behavior",
  title: "JavaScript",
};

describe("voice interview runtime", () => {
  it("maps assistant audio deltas into transcript items", () => {
    const item = {
      content: [
        {
          audio: null,
          transcript: null,
          type: "output_audio",
        },
      ],
      itemId: "assistant-1",
      previousItemId: null,
      role: "assistant",
      status: "in_progress",
      type: "message",
    } as RealtimeItem;

    expect(
      mapRealtimeItemToTranscriptItem({
        assistantDelta: "Start with the event loop.",
        item,
        meta: "00:04",
      }),
    ).toEqual({
      id: "assistant-1",
      label: "Interviewer",
      meta: "00:04",
      source: "realtime",
      speaker: "assistant",
      status: "streaming",
      text: "Start with the event loop.",
    });
  });

  it("inserts new transcript items after their previous item", () => {
    const transcript = [
      {
        id: "assistant-1",
        label: "Interviewer",
        meta: "00:04",
        speaker: "assistant" as const,
        text: "First question.",
      },
      {
        id: "assistant-2",
        label: "Interviewer",
        meta: "00:10",
        speaker: "assistant" as const,
        text: "Follow-up.",
      },
    ];

    const nextTranscript = upsertVoiceInterviewTranscriptItem(
      transcript,
      {
        id: "user-1",
        label: "You",
        meta: "00:08",
        speaker: "user",
        text: "First answer.",
      },
      "assistant-1",
    );

    expect(nextTranscript.map((item) => item.id)).toEqual([
      "assistant-1",
      "user-1",
      "assistant-2",
    ]);
  });

  it("builds a finalized user transcript item from raw transcription text", () => {
    expect(
      buildVoiceInterviewUserTranscriptItem({
        id: "user-1",
        meta: "00:12",
        text: " Trigger.new is available on insert and update. ",
      }),
    ).toEqual({
      id: "user-1",
      label: "You",
      meta: "00:12",
      source: "realtime",
      speaker: "user",
      status: "final",
      text: "Trigger.new is available on insert and update.",
    });
  });

  it("repositions an existing transcript item when the previous item becomes known", () => {
    const transcript = [
      {
        id: "assistant-1",
        label: "Interviewer",
        meta: "00:04",
        speaker: "assistant" as const,
        text: "First question.",
      },
      {
        id: "assistant-2",
        label: "Interviewer",
        meta: "00:10",
        speaker: "assistant" as const,
        text: "Follow-up.",
      },
      {
        id: "user-1",
        label: "You",
        meta: "00:08",
        speaker: "user" as const,
        text: "First answer.",
      },
    ];

    const nextTranscript = upsertVoiceInterviewTranscriptItem(
      transcript,
      {
        id: "user-1",
        label: "You",
        meta: "00:08",
        speaker: "user",
        text: "First answer.",
      },
      "assistant-1",
    );

    expect(nextTranscript.map((item) => item.id)).toEqual([
      "assistant-1",
      "user-1",
      "assistant-2",
    ]);
  });

  it("counts only finalized conversation turns in the runtime snapshot", () => {
    const session = buildVoiceInterviewRuntimeSnapshot({
      connectionLabel: "Realtime session connected",
      elapsedSeconds: 18,
      isMuted: false,
      scope,
      stage: "live",
      transcript: [
        {
          id: "system-1",
          label: "Session",
          meta: "00:02",
          speaker: "system",
          text: "Scope locked.",
          tone: "status",
        },
        {
          id: "assistant-1",
          label: "Interviewer",
          meta: "00:04",
          speaker: "assistant",
          text: "Explain the event loop.",
        },
        {
          id: "user-1",
          label: "You",
          meta: "00:12",
          speaker: "user",
          status: "streaming",
          text: "The event loop...",
        },
      ],
    });

    expect(session.connectionLabel).toBe("Realtime session connected");
    expect(session.transcriptCountLabel).toBe("1 finalized turns");
  });
});
