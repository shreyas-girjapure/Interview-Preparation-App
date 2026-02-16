import { describe, expect, it } from "vitest";

import {
  formatQuestionDuplicateWarning,
  formatTopicDuplicateWarning,
  normalizeOptionalText,
  publishSchema,
  saveDraftSchema,
  slugifyText,
} from "@/app/api/admin/content-package/route";

// ── slugifyText ──────────────────────────────────────────────────────────────

describe("slugifyText", () => {
  it("converts normal text to a slug", () => {
    expect(slugifyText("Hello World")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(slugifyText("What is a closure?")).toBe("what-is-a-closure");
  });

  it("collapses multiple dashes", () => {
    expect(slugifyText("a --- b")).toBe("a-b");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugifyText("  --hello--  ")).toBe("hello");
  });

  it("uses fallback for empty result", () => {
    expect(slugifyText("", "my-fallback")).toBe("my-fallback");
  });

  it("uses default fallback of 'untitled'", () => {
    expect(slugifyText("!!!")).toBe("untitled");
  });
});

// ── normalizeOptionalText ────────────────────────────────────────────────────

describe("normalizeOptionalText", () => {
  it("returns null for undefined", () => {
    expect(normalizeOptionalText(undefined)).toBe(null);
  });

  it("returns null for empty string", () => {
    expect(normalizeOptionalText("")).toBe(null);
  });

  it("returns null for whitespace-only", () => {
    expect(normalizeOptionalText("   ")).toBe(null);
  });

  it("returns trimmed text for valid input", () => {
    expect(normalizeOptionalText("  hello  ")).toBe("hello");
  });
});

// ── formatQuestionDuplicateWarning ───────────────────────────────────────────

describe("formatQuestionDuplicateWarning", () => {
  it("returns null for empty array", () => {
    expect(formatQuestionDuplicateWarning([])).toBe(null);
  });

  it("formats a single duplicate", () => {
    const result = formatQuestionDuplicateWarning([
      { slug: "what-is-x", title: "What is X?", status: "draft" },
    ]);
    expect(result).toContain("what-is-x (draft)");
  });

  it("truncates to 3 examples", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      slug: `slug-${i}`,
      title: `Title ${i}`,
      status: "draft",
    }));
    const result = formatQuestionDuplicateWarning(rows)!;
    expect(result.split(",").length).toBe(3);
  });

  it("defaults null status to draft", () => {
    const result = formatQuestionDuplicateWarning([
      { slug: "test", title: "Test", status: null },
    ]);
    expect(result).toContain("test (draft)");
  });
});

// ── formatTopicDuplicateWarning ──────────────────────────────────────────────

describe("formatTopicDuplicateWarning", () => {
  it("returns null for empty array", () => {
    expect(formatTopicDuplicateWarning([])).toBe(null);
  });

  it("includes subcategory context in message", () => {
    const result = formatTopicDuplicateWarning([
      { slug: "closures", name: "Closures", status: "published" },
    ]);
    expect(result).toContain("subcategory");
    expect(result).toContain("closures (published)");
  });
});

// ── Zod schema: publishSchema ────────────────────────────────────────────────

describe("publishSchema", () => {
  it("accepts valid publish payload", () => {
    const result = publishSchema.safeParse({
      action: "publish",
      data: { questionSlug: "what-is-closure" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid slug format", () => {
    const result = publishSchema.safeParse({
      action: "publish",
      data: { questionSlug: "Invalid Slug!" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing questionSlug", () => {
    const result = publishSchema.safeParse({
      action: "publish",
      data: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── Zod schema: saveDraftSchema ──────────────────────────────────────────────

describe("saveDraftSchema", () => {
  const validDraft = {
    action: "save_draft" as const,
    data: {
      existingTopicSlugs: ["closures"],
      createTopic: { enabled: false },
      question: {
        title: "What is a closure?",
        summary: "Closures in JavaScript.",
      },
      answer: {
        contentMarkdown: "# Answer\n\nA closure is...",
      },
    },
  };

  it("accepts valid draft payload", () => {
    const result = saveDraftSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  it("rejects empty question title", () => {
    const result = saveDraftSchema.safeParse({
      ...validDraft,
      data: {
        ...validDraft.data,
        question: { ...validDraft.data.question, title: "" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty answer markdown", () => {
    const result = saveDraftSchema.safeParse({
      ...validDraft,
      data: {
        ...validDraft.data,
        answer: { contentMarkdown: "" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects createTopic.enabled=true without name", () => {
    const result = saveDraftSchema.safeParse({
      ...validDraft,
      data: {
        ...validDraft.data,
        createTopic: {
          enabled: true,
          name: "",
          shortDescription: "Desc",
          subcategorySlug: "js-basics",
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects createTopic.enabled=true without subcategorySlug", () => {
    const result = saveDraftSchema.safeParse({
      ...validDraft,
      data: {
        ...validDraft.data,
        createTopic: {
          enabled: true,
          name: "Closures",
          shortDescription: "Desc",
          subcategorySlug: "",
        },
      },
    });
    expect(result.success).toBe(false);
  });
});
