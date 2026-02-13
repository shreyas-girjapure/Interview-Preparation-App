import { describe, expect, it } from "vitest";

import { buildAuthCallbackUrl, normalizeNextPath } from "@/lib/auth/redirect";

describe("auth redirect helpers", () => {
  it("normalizes relative next paths", () => {
    expect(normalizeNextPath("/account")).toBe("/account");
    expect(normalizeNextPath("https://evil.com")).toBe("/questions");
    expect(normalizeNextPath("//evil.com")).toBe("/questions");
    expect(normalizeNextPath(undefined)).toBe("/questions");
  });

  it("builds callback URL with safe next value", () => {
    const callbackUrl = buildAuthCallbackUrl(
      "https://example.com",
      "https://evil.com",
    );
    const parsedUrl = new URL(callbackUrl);

    expect(parsedUrl.pathname).toBe("/auth/callback");
    expect(parsedUrl.searchParams.get("next")).toBe("/questions");
  });
});
