import { describe, expect, it } from "vitest";

import {
  parsePublicEnv,
  parseServerEnv,
  parseVoiceInterviewEnv,
} from "@/lib/env";

function asProcessEnv(values: Record<string, string | undefined>) {
  return values as NodeJS.ProcessEnv;
}

describe("env validation", () => {
  it("parses public env values and applies app URL default", () => {
    const parsed = parsePublicEnv(
      asProcessEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    );

    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("fails when public supabase URL is invalid", () => {
    expect(() =>
      parsePublicEnv(
        asProcessEnv({
          NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        }),
      ),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("requires service role key for server env", () => {
    expect(() =>
      parseServerEnv(
        asProcessEnv({
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        }),
      ),
    ).toThrowError(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("parses voice interview env values with defaults", () => {
    const parsed = parseVoiceInterviewEnv(
      asProcessEnv({
        OPENAI_API_KEY: "openai-key",
      }),
    );

    expect(parsed.OPENAI_REALTIME_MODEL).toBe("gpt-realtime");
    expect(parsed.OPENAI_REALTIME_TRANSCRIBE_MODEL).toBe(
      "gpt-4o-mini-transcribe",
    );
    expect(parsed.OPENAI_REALTIME_TRANSCRIBE_LANGUAGE).toBe("en");
    expect(parsed.OPENAI_REALTIME_NOISE_REDUCTION_TYPE).toBe("near_field");
    expect(parsed.OPENAI_REALTIME_VOICE).toBe("marin");
    expect(parsed.OPENAI_REALTIME_CLIENT_SECRET_TTL_SECONDS).toBe(600);
  });

  it("fails when the voice interview key is missing", () => {
    expect(() => parseVoiceInterviewEnv(asProcessEnv({}))).toThrowError(
      /OPENAI_API_KEY/,
    );
  });
});
