import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and keeps tailwind conflict resolution", () => {
    const result = cn("p-4 text-sm", "text-base", ["font-semibold"]);

    expect(result).toBe("p-4 text-base font-semibold");
  });
});
