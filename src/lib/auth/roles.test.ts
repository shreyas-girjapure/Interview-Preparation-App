import { describe, expect, it } from "vitest";

import { hasAdminAreaAccess, isAppRole } from "@/lib/auth/roles";

describe("roles", () => {
  it("validates known app roles", () => {
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("editor")).toBe(true);
    expect(isAppRole("user")).toBe(true);
    expect(isAppRole("guest")).toBe(false);
    expect(isAppRole(null)).toBe(false);
  });

  it("allows only admin and editor to access admin area", () => {
    expect(hasAdminAreaAccess("admin")).toBe(true);
    expect(hasAdminAreaAccess("editor")).toBe(true);
    expect(hasAdminAreaAccess("user")).toBe(false);
    expect(hasAdminAreaAccess(null)).toBe(false);
  });
});
