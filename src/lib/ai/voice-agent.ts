import OpenAI from "openai";

import { getVoiceInterviewEnv, type VoiceInterviewEnv } from "@/lib/env";
import type { VoiceInterviewBootstrapTimingsMs } from "@/lib/interview/voice-interview-api";
import { buildVoiceInterviewPrompt } from "@/lib/interview/voice-interview-prompt";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

export type VoiceInterviewBrowserBootstrap = {
  clientSecret: {
    expiresAt: number;
    value: string;
  };
  realtime: {
    model: string;
    openAiSessionId: string | null;
    transcriptionModel: string;
    voice: string;
  };
  timingsMs: VoiceInterviewBootstrapTimingsMs;
};

type RealtimeClientSecretSessionConfig = NonNullable<
  Parameters<OpenAI["realtime"]["clientSecrets"]["create"]>[0]["session"]
>;

type VoiceInterviewRealtimeTracingConfig =
  | {
      group_id?: string;
      metadata?: Record<string, string>;
      workflow_name?: string;
    }
  | "auto"
  | null;

let openAiClientSingleton: OpenAI | null = null;

export class VoiceInterviewBootstrapTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Voice interview bootstrap timed out after ${timeoutMs}ms.`);
    this.name = "VoiceInterviewBootstrapTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export function isVoiceInterviewBootstrapTimeoutError(
  error: unknown,
): error is VoiceInterviewBootstrapTimeoutError {
  return error instanceof VoiceInterviewBootstrapTimeoutError;
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function roundDurationMs(durationMs: number) {
  return Math.max(0, Math.round(durationMs));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return await new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new VoiceInterviewBootstrapTimeoutError(timeoutMs));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function getOpenAiClient() {
  if (!openAiClientSingleton) {
    const env = getVoiceInterviewEnv();
    openAiClientSingleton = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return openAiClientSingleton;
}

export function buildVoiceInterviewRealtimeSessionConfig({
  env,
  scope,
  traceConfig,
}: {
  env: VoiceInterviewEnv;
  scope: VoiceInterviewScope;
  traceConfig?: VoiceInterviewRealtimeTracingConfig;
}): RealtimeClientSecretSessionConfig {
  const sessionPrompt = buildVoiceInterviewPrompt(scope);

  return {
    type: "realtime",
    model: env.OPENAI_REALTIME_MODEL,
    instructions: sessionPrompt,
    max_output_tokens: env.OPENAI_REALTIME_MAX_OUTPUT_TOKENS,
    output_modalities: ["audio"],
    audio: {
      input: {
        format: {
          type: "audio/pcm",
          rate: 24000,
        },
        transcription: {
          language: env.OPENAI_REALTIME_TRANSCRIBE_LANGUAGE,
          model: env.OPENAI_REALTIME_TRANSCRIBE_MODEL,
          prompt:
            "The speaker is answering an interview question in English. Preserve technical terms and proper nouns.",
        },
        noise_reduction: {
          type: env.OPENAI_REALTIME_NOISE_REDUCTION_TYPE,
        },
        turn_detection: {
          type: "server_vad",
          create_response: true,
          interrupt_response: false,
          prefix_padding_ms: env.OPENAI_REALTIME_SERVER_VAD_PREFIX_PADDING_MS,
          silence_duration_ms:
            env.OPENAI_REALTIME_SERVER_VAD_SILENCE_DURATION_MS,
          threshold: env.OPENAI_REALTIME_SERVER_VAD_THRESHOLD,
        },
      },
      output: {
        format: {
          type: "audio/pcm",
          rate: 24000,
        },
        voice: env.OPENAI_REALTIME_VOICE,
        speed: 1,
      },
    },
    tools: [],
    tool_choice: "auto",
    tracing: traceConfig ?? null,
  };
}

export async function createVoiceInterviewBrowserBootstrap({
  scope,
  traceConfig,
}: {
  scope: VoiceInterviewScope;
  traceConfig?: VoiceInterviewRealtimeTracingConfig;
}): Promise<VoiceInterviewBrowserBootstrap> {
  const env = getVoiceInterviewEnv();
  const client = getOpenAiClient();
  const totalStartedAt = nowMs();
  const openAiBootstrapStartedAt = nowMs();
  const sessionConfig = buildVoiceInterviewRealtimeSessionConfig({
    env,
    scope,
    traceConfig,
  });

  const session = await withTimeout(
    client.realtime.clientSecrets.create({
      expires_after: {
        anchor: "created_at",
        seconds: env.OPENAI_REALTIME_CLIENT_SECRET_TTL_SECONDS,
      },
      session: sessionConfig,
    }),
    env.OPENAI_REALTIME_BOOTSTRAP_TIMEOUT_MS,
  );
  const openAiBootstrapMs = roundDurationMs(nowMs() - openAiBootstrapStartedAt);

  const openAiSessionId =
    "id" in session.session && typeof session.session.id === "string"
      ? session.session.id
      : null;

  return {
    clientSecret: {
      expiresAt: session.expires_at,
      value: session.value,
    },
    realtime: {
      model: env.OPENAI_REALTIME_MODEL,
      openAiSessionId,
      transcriptionModel: env.OPENAI_REALTIME_TRANSCRIBE_MODEL,
      voice: env.OPENAI_REALTIME_VOICE,
    },
    timingsMs: {
      openAiBootstrap: openAiBootstrapMs,
      total: roundDurationMs(nowMs() - totalStartedAt),
    },
  };
}
