import { describe, expect, it } from "vitest";

import { buildVoiceInterviewRealtimeSessionConfig } from "@/lib/ai/voice-agent";
import { parseVoiceInterviewEnv } from "@/lib/env";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

const scope: VoiceInterviewScope = {
  evaluationDimensions: ["Concept precision"],
  expectations: ["Stay on topic"],
  questionMap: ["Explain the event loop."],
  questionSummaries: [
    {
      id: "q-1",
      slug: "event-loop",
      summary: "Explain the event loop in plain language.",
      title: "Explain the event loop.",
    },
  ],
  scopeLabel: "Topic scope",
  scopeType: "topic",
  slug: "javascript",
  starterPrompts: ["Start with the event loop."],
  stayInScope: "Stay on JavaScript event loops.",
  summary: "JavaScript runtime behavior",
  title: "JavaScript",
};

function asProcessEnv(values: Record<string, string | undefined>) {
  return values as NodeJS.ProcessEnv;
}

describe("voice agent runtime tuning", () => {
  it("uses conservative default output and VAD settings", () => {
    const env = parseVoiceInterviewEnv(
      asProcessEnv({
        OPENAI_API_KEY: "openai-key",
      }),
    );

    const config = buildVoiceInterviewRealtimeSessionConfig({
      env,
      scope,
    });

    expect(config.max_output_tokens).toBe(640);
    expect(config.audio.input.turn_detection).toEqual(
      expect.objectContaining({
        prefix_padding_ms: 450,
        silence_duration_ms: 1_200,
        threshold: 0.72,
      }),
    );
  });

  it("applies env overrides to the runtime tuning", () => {
    const env = parseVoiceInterviewEnv(
      asProcessEnv({
        OPENAI_API_KEY: "openai-key",
        OPENAI_REALTIME_MAX_OUTPUT_TOKENS: "480",
        OPENAI_REALTIME_SERVER_VAD_PREFIX_PADDING_MS: "650",
        OPENAI_REALTIME_SERVER_VAD_SILENCE_DURATION_MS: "1600",
        OPENAI_REALTIME_SERVER_VAD_THRESHOLD: "0.8",
      }),
    );

    const config = buildVoiceInterviewRealtimeSessionConfig({
      env,
      scope,
    });

    expect(config.max_output_tokens).toBe(480);
    expect(config.audio.input.turn_detection).toEqual(
      expect.objectContaining({
        prefix_padding_ms: 650,
        silence_duration_ms: 1_600,
        threshold: 0.8,
      }),
    );
  });
});
