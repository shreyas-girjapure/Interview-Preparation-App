import { describe, expect, it } from "vitest";

import { paginateItems, parsePositiveInt } from "@/lib/pagination";

describe("pagination helpers", () => {
  it("parses positive integers and falls back for invalid values", () => {
    expect(parsePositiveInt("3", 1)).toBe(3);
    expect(parsePositiveInt("0", 1)).toBe(1);
    expect(parsePositiveInt("-1", 1)).toBe(1);
    expect(parsePositiveInt("abc", 1)).toBe(1);
    expect(parsePositiveInt(null, 1)).toBe(1);
  });

  it("paginates items with clamped page boundaries", () => {
    const items = Array.from({ length: 23 }, (_, index) => index + 1);
    const page = paginateItems(items, 99, 10);

    expect(page.page).toBe(3);
    expect(page.total).toBe(23);
    expect(page.totalPages).toBe(3);
    expect(page.start).toBe(21);
    expect(page.end).toBe(23);
    expect(page.items).toEqual([21, 22, 23]);
    expect(page.hasPreviousPage).toBe(true);
    expect(page.hasNextPage).toBe(false);
  });

  it("returns zeroed ranges for empty collections", () => {
    const page = paginateItems<string>([], 1, 10);

    expect(page.page).toBe(1);
    expect(page.total).toBe(0);
    expect(page.totalPages).toBe(1);
    expect(page.start).toBe(0);
    expect(page.end).toBe(0);
    expect(page.items).toEqual([]);
    expect(page.hasPreviousPage).toBe(false);
    expect(page.hasNextPage).toBe(false);
  });
});
