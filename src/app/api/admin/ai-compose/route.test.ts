import { describe, expect, it } from "vitest";

import {
  normalizeNameForComparison,
  normalizeQuestionTitleForDuplicate,
  slugifyText,
} from "@/app/api/admin/ai-compose/route";

describe("normalizeNameForComparison", () => {
  it("normalizes punctuation and spacing", () => {
    expect(normalizeNameForComparison(" Integration & APIs ")).toBe(
      "integration apis",
    );
  });

  it("is case-insensitive", () => {
    expect(normalizeNameForComparison("Apex Programming")).toBe(
      normalizeNameForComparison("apex programming"),
    );
  });
});

describe("normalizeQuestionTitleForDuplicate", () => {
  it("normalizes equivalent question titles", () => {
    const first = normalizeQuestionTitleForDuplicate(
      "How do Apex triggers work?",
    );
    const second = normalizeQuestionTitleForDuplicate(
      "How do apex triggers work",
    );

    expect(first).toBe(second);
  });
});

describe("slugifyText", () => {
  it("converts text to kebab-case slug", () => {
    expect(slugifyText("Review this Trigger Handler")).toBe(
      "review-this-trigger-handler",
    );
  });

  it("uses fallback for empty value", () => {
    expect(slugifyText("!!!", "topic")).toBe("topic");
  });
});
