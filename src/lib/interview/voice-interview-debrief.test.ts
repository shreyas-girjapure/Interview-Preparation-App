import { describe, expect, it } from "vitest";

import { buildVoiceInterviewDebrief } from "@/lib/interview/voice-interview-debrief";

describe("voice interview debrief", () => {
  it("builds a deterministic structured debrief from transcript and metrics", () => {
    const debrief = buildVoiceInterviewDebrief({
      metrics: {
        assistantTurnCount: 2,
        elapsedSeconds: 96,
        finalizedTurnCount: 4,
        persistedMessageCount: 5,
        searchTurnCount: 1,
        userTurnCount: 2,
      },
      scopeTitle: "JavaScript Event Loop",
      transcript: [
        {
          clientSequence: 0,
          finalizedAt: "2026-03-10T12:00:00.000Z",
          itemId: "assistant-1",
          label: "Interviewer",
          metaLabel: "00:02",
          source: "realtime",
          speaker: "assistant",
          text: "Start by explaining the event loop in plain language.",
        },
        {
          clientSequence: 1,
          finalizedAt: "2026-03-10T12:00:05.000Z",
          itemId: "user-1",
          label: "You",
          metaLabel: "00:10",
          source: "realtime",
          speaker: "user",
          text: "The event loop checks queues and pushes callbacks onto the call stack when it is clear, which keeps async work coordinated.",
        },
      ],
    });

    expect(debrief.summary.length).toBeGreaterThan(0);
    expect(debrief.strengths).toContain("strongest contribution");
    expect(debrief.nextDrill).toContain("JavaScript Event Loop");
    expect(debrief.confidenceNotes).toContain("96s elapsed");
  });
});
