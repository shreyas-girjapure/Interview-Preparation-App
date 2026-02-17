import { describe, expect, it } from "vitest";

import { cn, dedupeKeepOrder, pickSingle } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and keeps tailwind conflict resolution", () => {
    const result = cn("p-4 text-sm", "text-base", ["font-semibold"]);

    expect(result).toBe("p-4 text-base font-semibold");
  });
});

// ── pickSingle ───────────────────────────────────────────────────────────────

describe("pickSingle", () => {
  it("returns null for null", () => {
    expect(pickSingle(null)).toBe(null);
  });

  it("returns null for undefined", () => {
    expect(pickSingle(undefined)).toBe(null);
  });

  it("returns the value when given a single object", () => {
    expect(pickSingle({ a: 1 })).toEqual({ a: 1 });
  });

  it("returns first element when given an array", () => {
    expect(pickSingle([{ a: 1 }, { a: 2 }])).toEqual({ a: 1 });
  });

  it("returns null for an empty array", () => {
    expect(pickSingle([])).toBe(null);
  });

  it("handles string values", () => {
    expect(pickSingle("hello")).toBe("hello");
  });
});

// ── dedupeKeepOrder ──────────────────────────────────────────────────────────

describe("dedupeKeepOrder", () => {
  it("preserves order and removes duplicates", () => {
    expect(dedupeKeepOrder(["b", "a", "b", "c", "a"])).toEqual(["b", "a", "c"]);
  });

  it("returns empty array for empty input", () => {
    expect(dedupeKeepOrder([])).toEqual([]);
  });

  it("returns same array when no duplicates", () => {
    expect(dedupeKeepOrder(["x", "y", "z"])).toEqual(["x", "y", "z"]);
  });

  it("handles single-element array", () => {
    expect(dedupeKeepOrder(["a"])).toEqual(["a"]);
  });
});
