import { describe, expect, it } from "vitest";

import { toAbsoluteVoiceInterviewCitationUrl } from "@/lib/interview/voice-interview-citations";

describe("voice interview citations", () => {
  it("converts relative app links into absolute urls", () => {
    expect(
      toAbsoluteVoiceInterviewCitationUrl(
        "/topics/apex-fundamentals",
        "http://localhost:3000",
      ),
    ).toBe("http://localhost:3000/topics/apex-fundamentals");
  });

  it("preserves absolute urls", () => {
    expect(
      toAbsoluteVoiceInterviewCitationUrl(
        "https://example.com/questions/apex-basics",
        "http://localhost:3000",
      ),
    ).toBe("https://example.com/questions/apex-basics");
  });

  it("returns the original href when no base url is available", () => {
    expect(
      toAbsoluteVoiceInterviewCitationUrl("/topics/apex-fundamentals"),
    ).toBe("/topics/apex-fundamentals");
  });
});
