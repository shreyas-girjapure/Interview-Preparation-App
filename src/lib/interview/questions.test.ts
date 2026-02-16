import { describe, expect, it } from "vitest";

import {
  countOverlap,
  deriveFallbackPrerequisiteTopicIds,
  matchesQuestionSearch,
  matchesTopicSearch,
  mapCategoryMetadata,
  mapQuestionDetail,
  mapQuestionSummary,
  mapTopicSlugs,
  normalize,
  stripGeneratedTopicSections,
} from "@/lib/interview/questions";

// ── normalize ────────────────────────────────────────────────────────────────

describe("normalize", () => {
  it("lowercases and trims", () => {
    expect(normalize("  Hello World  ")).toBe("hello world");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalize("   ")).toBe("");
  });
});

// ── countOverlap ─────────────────────────────────────────────────────────────

describe("countOverlap", () => {
  it("returns 0 when either array is empty", () => {
    expect(countOverlap([], ["a"])).toBe(0);
    expect(countOverlap(["a"], [])).toBe(0);
    expect(countOverlap([], [])).toBe(0);
  });

  it("counts shared items", () => {
    expect(countOverlap(["a", "b", "c"], ["b", "c", "d"])).toBe(2);
  });

  it("deduplicates left side", () => {
    expect(countOverlap(["a", "a", "a"], ["a"])).toBe(1);
  });

  it("returns 0 when no items overlap", () => {
    expect(countOverlap(["x", "y"], ["a", "b"])).toBe(0);
  });
});

// ── stripGeneratedTopicSections ──────────────────────────────────────────────

describe("stripGeneratedTopicSections", () => {
  it("strips ## Prerequisites section", () => {
    const input =
      "# Topic\n\nSome intro.\n\n## Prerequisites\n\n- item a\n- item b\n\n## Other";
    const result = stripGeneratedTopicSections(input);
    expect(result).toContain("# Topic");
    expect(result).toContain("Some intro.");
    expect(result).not.toContain("Prerequisites");
    expect(result).not.toContain("item a");
    expect(result).toContain("## Other");
  });

  it("strips ## Related Topics section", () => {
    const input =
      "# Topic\n\n## Related Topics\n\n- topic a\n\n## Summary\n\nDone.";
    const result = stripGeneratedTopicSections(input);
    expect(result).not.toContain("Related Topics");
    expect(result).not.toContain("topic a");
    expect(result).toContain("## Summary");
    expect(result).toContain("Done.");
  });

  it("returns original when no sections match", () => {
    const input = "# Topic\n\n## Details\n\nSome text.";
    const result = stripGeneratedTopicSections(input);
    expect(result).toBe(input);
  });

  it("handles empty input", () => {
    expect(stripGeneratedTopicSections("")).toBe("");
  });
});

// ── mapTopicSlugs ────────────────────────────────────────────────────────────

describe("mapTopicSlugs", () => {
  it("returns empty array for null input", () => {
    expect(mapTopicSlugs(null)).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(mapTopicSlugs([])).toEqual([]);
  });

  it("extracts topic slugs sorted by sort_order", () => {
    const topics = [
      {
        sort_order: 20,
        topics: {
          id: "2",
          slug: "b",
          name: "B",
          short_description: "",
          status: "published",
          subcategories: null,
        },
      },
      {
        sort_order: 10,
        topics: {
          id: "1",
          slug: "a",
          name: "A",
          short_description: "",
          status: "published",
          subcategories: null,
        },
      },
    ];
    expect(mapTopicSlugs(topics)).toEqual(["a", "b"]);
  });

  it("filters out draft topics", () => {
    const topics = [
      {
        sort_order: 10,
        topics: {
          id: "1",
          slug: "draft-topic",
          name: "Draft",
          short_description: "",
          status: "draft",
          subcategories: null,
        },
      },
      {
        sort_order: 20,
        topics: {
          id: "2",
          slug: "published-topic",
          name: "Published",
          short_description: "",
          status: "published",
          subcategories: null,
        },
      },
    ];
    expect(mapTopicSlugs(topics)).toEqual(["published-topic"]);
  });

  it("deduplicates slugs", () => {
    const topics = [
      {
        sort_order: 10,
        topics: {
          id: "1",
          slug: "same",
          name: "Same",
          short_description: "",
          status: "published",
          subcategories: null,
        },
      },
      {
        sort_order: 20,
        topics: {
          id: "2",
          slug: "same",
          name: "Same 2",
          short_description: "",
          status: "published",
          subcategories: null,
        },
      },
    ];
    expect(mapTopicSlugs(topics)).toEqual(["same"]);
  });
});

// ── mapCategoryMetadata ──────────────────────────────────────────────────────

describe("mapCategoryMetadata", () => {
  it("returns empty labels/slugs for null input", () => {
    expect(mapCategoryMetadata(null)).toEqual({ labels: [], slugs: [] });
  });

  it("extracts category from topic → subcategory → category chain", () => {
    const topics = [
      {
        sort_order: 10,
        topics: {
          id: "1",
          slug: "t",
          name: "T",
          short_description: "",
          status: "published",
          subcategories: {
            slug: "sub",
            name: "Sub",
            categories: { slug: "javascript", name: "JavaScript" },
          },
        },
      },
    ];
    const result = mapCategoryMetadata(topics);
    expect(result.labels).toEqual(["JavaScript"]);
    expect(result.slugs).toEqual(["javascript"]);
  });

  it("deduplicates categories", () => {
    const makeTopic = (id: string) => ({
      sort_order: 10,
      topics: {
        id,
        slug: `t-${id}`,
        name: `Topic ${id}`,
        short_description: "",
        status: "published",
        subcategories: {
          slug: "sub",
          name: "Sub",
          categories: { slug: "javascript", name: "JavaScript" },
        },
      },
    });
    const topics = [makeTopic("1"), makeTopic("2")];
    const result = mapCategoryMetadata(topics);
    expect(result.labels).toEqual(["JavaScript"]);
  });
});

// ── mapQuestionSummary ───────────────────────────────────────────────────────

describe("mapQuestionSummary", () => {
  const baseRow = {
    id: "q1",
    slug: "what-is-closure",
    title: "What is a closure?",
    summary: "A closure explanation.",
    created_at: null,
    published_at: null,
    sort_order: null,
    question_topics: null,
  };

  it("maps a row with no topics", () => {
    const result = mapQuestionSummary(baseRow);
    expect(result.id).toBe("q1");
    expect(result.slug).toBe("what-is-closure");
    expect(result.title).toBe("What is a closure?");
    expect(result.summary).toBe("A closure explanation.");
    expect(result.category).toBe("General");
    expect(result.categories).toEqual([]);
    expect(result.topicSlugs).toEqual([]);
  });

  it("defaults summary when empty", () => {
    const result = mapQuestionSummary({ ...baseRow, summary: "  " });
    expect(result.summary).toBe("No summary available yet.");
  });
});

// ── mapQuestionDetail ────────────────────────────────────────────────────────

describe("mapQuestionDetail", () => {
  it("includes answerMarkdown alongside summary fields", () => {
    const row = {
      id: "q1",
      slug: "test",
      title: "Test",
      summary: "Summary",
      created_at: null,
      published_at: null,
      sort_order: null,
      question_topics: null,
    };
    const result = mapQuestionDetail(row, "# Answer\n\nHere is the answer.");
    expect(result.answerMarkdown).toBe("# Answer\n\nHere is the answer.");
    expect(result.slug).toBe("test");
  });
});

// ── matchesQuestionSearch ────────────────────────────────────────────────────

describe("matchesQuestionSearch", () => {
  const question = {
    id: "1",
    slug: "what-is-closure",
    title: "What is a closure?",
    category: "JavaScript",
    categories: ["JavaScript"],
    categorySlugs: ["javascript"],
    summary: "Closures capture variables from outer scope.",
    topicSlugs: ["closures"],
  };

  it("returns true for empty search", () => {
    expect(matchesQuestionSearch(question, "")).toBe(true);
    expect(matchesQuestionSearch(question, "   ")).toBe(true);
  });

  it("matches on title", () => {
    expect(matchesQuestionSearch(question, "closure")).toBe(true);
  });

  it("matches on category", () => {
    expect(matchesQuestionSearch(question, "javascript")).toBe(true);
  });

  it("matches on summary", () => {
    expect(matchesQuestionSearch(question, "outer scope")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(matchesQuestionSearch(question, "CLOSURE")).toBe(true);
  });

  it("returns false for non-matching search", () => {
    expect(matchesQuestionSearch(question, "react hooks")).toBe(false);
  });
});

// ── matchesTopicSearch ───────────────────────────────────────────────────────

describe("matchesTopicSearch", () => {
  const topic = {
    id: "1",
    slug: "closures",
    name: "Closures",
    shortDescription: "Understanding JavaScript closures.",
    questionCount: 5,
  };

  it("returns true for empty search", () => {
    expect(matchesTopicSearch(topic, "")).toBe(true);
  });

  it("matches on name", () => {
    expect(matchesTopicSearch(topic, "closures")).toBe(true);
  });

  it("matches on description", () => {
    expect(matchesTopicSearch(topic, "javascript")).toBe(true);
  });

  it("matches on slug", () => {
    expect(matchesTopicSearch(topic, "closures")).toBe(true);
  });

  it("returns false for non-matching search", () => {
    expect(matchesTopicSearch(topic, "python")).toBe(false);
  });
});

// ── deriveFallbackPrerequisiteTopicIds ───────────────────────────────────────

describe("deriveFallbackPrerequisiteTopicIds", () => {
  const makeTopic = (
    id: string,
    slug: string,
    name: string,
    sortOrder: number,
    subcategoryId: string | null,
  ) => ({
    id,
    slug,
    name,
    short_description: "",
    overview_markdown: null,
    sort_order: sortOrder,
    subcategory_id: subcategoryId,
  });

  it("returns topics from same subcategory with lower sort_order", () => {
    const current = makeTopic("3", "advanced", "Advanced", 30, "sub-a");
    const allTopics = [
      makeTopic("1", "fundamentals", "Fundamentals", 10, "sub-a"),
      makeTopic("2", "intermediate", "Intermediate", 20, "sub-a"),
      current,
      makeTopic("4", "other", "Other", 5, "sub-b"),
    ];
    const result = deriveFallbackPrerequisiteTopicIds(current, allTopics);
    expect(result).toEqual(["1", "2"]);
  });

  it("prioritizes foundational topics", () => {
    const current = makeTopic("3", "advanced", "Advanced", 30, "sub-a");
    const allTopics = [
      makeTopic("2", "details", "Details", 20, "sub-a"),
      makeTopic("1", "basics-101", "Basics 101", 25, "sub-a"),
      current,
    ];
    const result = deriveFallbackPrerequisiteTopicIds(current, allTopics);
    // basics-101 should come first despite higher sort_order because it has a foundational keyword
    expect(result[0]).toBe("1");
  });

  it("returns empty when no same-subcategory topics exist", () => {
    const current = makeTopic("1", "topic", "Topic", 10, "sub-a");
    const allTopics = [current, makeTopic("2", "other", "Other", 5, "sub-b")];
    expect(deriveFallbackPrerequisiteTopicIds(current, allTopics)).toEqual([]);
  });
});
