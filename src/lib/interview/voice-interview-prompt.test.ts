import { describe, expect, it } from "vitest";

import { buildVoiceInterviewPrompt } from "@/lib/interview/voice-interview-prompt";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

const scope: VoiceInterviewScope = {
  evaluationDimensions: [
    "Concept precision under follow-up pressure",
    "Production examples and tradeoff reasoning",
  ],
  expectations: [
    "Explain the event loop precisely.",
    "Use one production example.",
  ],
  questionMap: [
    "What is the JavaScript event loop?",
    "When does it create production issues?",
  ],
  questionSummaries: [
    {
      id: "q-1",
      slug: "javascript-event-loop",
      summary: "Explain the event loop in plain language.",
      title: "What is the JavaScript event loop?",
    },
  ],
  scopeLabel: "Topic scope",
  scopeType: "topic",
  slug: "javascript",
  starterPrompts: ["Start with a plain-language explanation."],
  stayInScope:
    "If the learner drifts away, bring them back to JavaScript event-loop behavior.",
  summary: "How JavaScript schedules work between the call stack and queues.",
  title: "JavaScript Event Loop",
};

describe("voice interview prompt", () => {
  it("uses a coach-and-probe interviewer style", () => {
    const prompt = buildVoiceInterviewPrompt(scope);

    expect(prompt).toContain("Be a coach who probes.");
    expect(prompt).toContain("Ask one interview question at a time.");
    expect(prompt).toContain(
      "give one compact correction or framing hint, then ask exactly one sharper follow-up.",
    );
  });

  it("locks the model to the active scope and redirects off-topic requests", () => {
    const prompt = buildVoiceInterviewPrompt(scope);

    expect(prompt).toContain("Stay inside JavaScript Event Loop.");
    expect(prompt).toContain("Off-topic example");
    expect(prompt).toContain("We are staying inside JavaScript Event Loop");
  });

  it("keeps recent-changes browsing unavailable and spoken turns concise", () => {
    const prompt = buildVoiceInterviewPrompt(scope);

    expect(prompt).toContain(
      "Recent-changes browsing is not enabled directly in this session.",
    );
    expect(prompt).toContain(
      "Keep each spoken turn compact but complete. Aim for one to three sentences and finish the thought instead of clipping mid-sentence.",
    );
    expect(prompt).toContain(
      'Rambling example: "Pause there. Give me the thirty-second version: point, example, tradeoff."',
    );
  });
});
