import { describe, expect, it } from "vitest";

import {
  getQuestionBySlug,
  isQuestionDifficulty,
  listQuestionFilterOptions,
  listQuestions,
} from "@/lib/interview/questions";

describe("interview questions", () => {
  it("filters by category and difficulty", () => {
    const results = listQuestions({
      category: "react",
      difficulty: "easy",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.slug).toBe("react-keys-and-reconciliation");
  });

  it("supports case-insensitive search", () => {
    const results = listQuestions({
      search: "CACHE",
    });

    expect(results.map((question) => question.slug)).toContain(
      "system-design-caching-strategy",
    );
  });

  it("returns question details by slug", () => {
    const question = getQuestionBySlug("nodejs-event-loop");

    expect(question?.id).toBe("q_node_event_loop");
    expect(question?.answerMarkdown).toContain("event loop");
  });

  it("validates allowed difficulty values", () => {
    expect(isQuestionDifficulty("easy")).toBe(true);
    expect(isQuestionDifficulty("expert")).toBe(false);
    expect(isQuestionDifficulty(null)).toBe(false);
  });

  it("exposes filter option counts", () => {
    const { categories, difficulties } = listQuestionFilterOptions();
    const behaviorCategory = categories.find(
      (category) => category.value === "behavioral",
    );
    const hardDifficulty = difficulties.find(
      (difficulty) => difficulty.value === "hard",
    );

    expect(behaviorCategory?.count).toBe(1);
    expect(hardDifficulty?.count).toBe(1);
  });
});
