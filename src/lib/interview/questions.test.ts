import { describe, expect, it } from "vitest";

import {
  QUESTION_DIFFICULTIES,
  isQuestionDifficulty,
} from "@/lib/interview/questions";

describe("interview questions helpers", () => {
  it("validates allowed difficulty values", () => {
    for (const difficulty of QUESTION_DIFFICULTIES) {
      expect(isQuestionDifficulty(difficulty)).toBe(true);
    }

    expect(isQuestionDifficulty("expert")).toBe(false);
    expect(isQuestionDifficulty(null)).toBe(false);
  });

  it("rejects empty and malformed difficulty values", () => {
    expect(isQuestionDifficulty("")).toBe(false);
    expect(isQuestionDifficulty(" Easy ")).toBe(false);
    expect(isQuestionDifficulty("HARD")).toBe(false);
  });
});
