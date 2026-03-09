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

const voiceInterviewEnvSchema = z.object({
  OPENAI_API_KEY: requiredString,
  OPENAI_REALTIME_MODEL: requiredString.default("gpt-realtime"),
  OPENAI_REALTIME_TRANSCRIBE_MODEL: requiredString.default(
    "gpt-4o-mini-transcribe",
  ),
  OPENAI_REALTIME_TRANSCRIBE_LANGUAGE: requiredString.default("en"),
  OPENAI_REALTIME_NOISE_REDUCTION_TYPE: z
    .enum(["near_field", "far_field"])
    .default("near_field"),
  OPENAI_REALTIME_VOICE: requiredString.default("marin"),
  OPENAI_REALTIME_CLIENT_SECRET_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(10)
    .max(7200)
    .default(600),
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
