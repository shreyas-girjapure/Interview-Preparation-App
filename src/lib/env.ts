import { z } from "zod";

const requiredString = z.string().trim().min(1, "Required");
const requiredUrl = z.string().trim().url("Must be a valid URL");

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: requiredUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString,
  NEXT_PUBLIC_APP_URL: requiredUrl.default("http://localhost:3000"),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: requiredString,
});

const reasoningEffortSchema = z.enum([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
]);

const runtimePreferenceSchema = z.enum([
  "auto",
  "realtime_sts",
  "chained_voice",
]);

const voiceInterviewEnvSchema = z.object({
  OPENAI_API_KEY: requiredString,
  OPENAI_VOICE_GROUNDING_MODEL: requiredString.default("gpt-5.4"),
  OPENAI_VOICE_GROUNDING_MAX_OUTPUT_TOKENS: z.coerce
    .number()
    .int()
    .min(300)
    .max(4_096)
    .default(1_200),
  OPENAI_VOICE_GROUNDING_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(15_000)
    .default(15_000),
  OPENAI_VOICE_GROUNDING_CACHE_TTL_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(86_400_000)
    .default(21_600_000),
  OPENAI_VOICE_GROUNDING_STALE_TTL_MS: z.coerce
    .number()
    .int()
    .min(300_000)
    .max(604_800_000)
    .default(86_400_000),
  OPENAI_REALTIME_BOOTSTRAP_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(5_000)
    .max(60_000)
    .default(20_000),
  OPENAI_REALTIME_MODEL: requiredString.default("gpt-realtime"),
  OPENAI_REALTIME_MAX_OUTPUT_TOKENS: z.coerce
    .number()
    .int()
    .min(100)
    .max(4_096)
    .default(1_024),
  OPENAI_REALTIME_TRANSCRIBE_MODEL: requiredString.default(
    "gpt-4o-mini-transcribe",
  ),
  OPENAI_REALTIME_TRANSCRIBE_LANGUAGE: requiredString.default("en"),
  OPENAI_REALTIME_NOISE_REDUCTION_TYPE: z
    .enum(["near_field", "far_field"])
    .default("near_field"),
  OPENAI_REALTIME_SERVER_VAD_PREFIX_PADDING_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(2_000)
    .default(450),
  OPENAI_REALTIME_SERVER_VAD_SILENCE_DURATION_MS: z.coerce
    .number()
    .int()
    .min(400)
    .max(4_000)
    .default(1_200),
  OPENAI_REALTIME_SERVER_VAD_THRESHOLD: z.coerce
    .number()
    .min(0.1)
    .max(0.95)
    .default(0.72),
  OPENAI_REALTIME_VOICE: requiredString.default("marin"),
  OPENAI_REALTIME_CLIENT_SECRET_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(10)
    .max(7200)
    .default(600),
  VOICE_INTERVIEW_DEFAULT_RUNTIME_PREFERENCE:
    runtimePreferenceSchema.default("realtime_sts"),
  OPENAI_CHAINED_DEFAULT_VOICE: requiredString.default("marin"),
  OPENAI_CHAINED_TRANSCRIBE_MODEL: requiredString.default(
    "gpt-4o-mini-transcribe",
  ),
  OPENAI_CHAINED_TEXT_MODEL_PREMIUM: requiredString.default("gpt-5.4"),
  OPENAI_CHAINED_TEXT_MODEL_BALANCED: requiredString.default("gpt-5.2"),
  OPENAI_CHAINED_TTS_MODEL: requiredString.default("gpt-4o-mini-tts"),
  OPENAI_CHAINED_REASONING_EFFORT_PREMIUM: reasoningEffortSchema.default("low"),
  OPENAI_CHAINED_OPENING_MAX_OUTPUT_TOKENS: z.coerce
    .number()
    .int()
    .min(100)
    .max(4_096)
    .default(220),
  OPENAI_CHAINED_REPLY_MAX_OUTPUT_TOKENS: z.coerce
    .number()
    .int()
    .min(120)
    .max(4_096)
    .default(420),
  OPENAI_CHAINED_MAX_TURN_SECONDS: z.coerce
    .number()
    .int()
    .min(5)
    .max(120)
    .default(45),
  OPENAI_CHAINED_AUTO_COMMIT_SILENCE_MS: z.coerce
    .number()
    .int()
    .min(400)
    .max(4_000)
    .default(1_200),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type VoiceInterviewEnv = z.infer<typeof voiceInterviewEnvSchema>;

function formatIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const key = issue.path.join(".") || "env";
      return `- ${key}: ${issue.message}`;
    })
    .join("\n");
}

function parseWithSchema<T extends z.ZodType>(
  schema: T,
  env: NodeJS.ProcessEnv,
  scope: "public" | "server",
): z.infer<T> {
  const result = schema.safeParse(env);

  if (!result.success) {
    throw new Error(
      `Invalid ${scope} environment variables:\n${formatIssues(result.error)}`,
    );
  }

  return result.data;
}

export function parsePublicEnv(env: NodeJS.ProcessEnv): PublicEnv {
  return parseWithSchema(publicEnvSchema, env, "public");
}

export function parseServerEnv(env: NodeJS.ProcessEnv): ServerEnv {
  return parseWithSchema(serverEnvSchema, env, "server");
}

export function parseVoiceInterviewEnv(
  env: NodeJS.ProcessEnv,
): VoiceInterviewEnv {
  return parseWithSchema(voiceInterviewEnvSchema, env, "server");
}

export function getPublicEnv(): PublicEnv {
  return parsePublicEnv(process.env);
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

export function getVoiceInterviewEnv(): VoiceInterviewEnv {
  return parseVoiceInterviewEnv(process.env);
}
