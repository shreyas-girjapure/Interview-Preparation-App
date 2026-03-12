import type { ClientSecretCreateParams } from "openai/resources/realtime/client-secrets";

import { getServerOpenAiClient } from "@/lib/ai/server-openai";
import { getVoiceInterviewEnv, type VoiceInterviewEnv } from "@/lib/env";
import type {
  RealtimeWebRtcTransport,
  VoiceInterviewBootstrapTimingsMs,
  VoiceInterviewRuntimeDescriptor,
} from "@/lib/interview/voice-interview-api";
import { buildVoiceInterviewPrompt } from "@/lib/interview/voice-interview-prompt";
import type { ScopedDocumentationGroundingBrief } from "@/lib/interview/scoped-documentation-search";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

export type VoiceInterviewRealtimeBootstrap = {
  runtime: VoiceInterviewRuntimeDescriptor;
  timingsMs: VoiceInterviewBootstrapTimingsMs;
  transport: RealtimeWebRtcTransport;
};

type RealtimeClientSecretSessionConfig = NonNullable<
  ClientSecretCreateParams["session"]
>;

type VoiceInterviewRealtimeTracingConfig =
  | {
      group_id?: string;
      metadata?: Record<string, string>;
      workflow_name?: string;
    }
  | "auto"
  | null;

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

export function buildRealtimeVoiceInterviewRuntimeDescriptor(
  env: VoiceInterviewEnv,
): VoiceInterviewRuntimeDescriptor {
  return {
    kind: "realtime_sts",
    models: {
      realtime: env.OPENAI_REALTIME_MODEL,
      transcribe: env.OPENAI_REALTIME_TRANSCRIBE_MODEL,
    },
    profileId: "realtime_voice_premium",
    profileVersion: "2026-03-12",
    selectionSource: "user_preference",
    transport: "realtime_webrtc",
    turnStrategy: "server_vad_full_duplex",
    voice: env.OPENAI_REALTIME_VOICE,
  };
}

export function buildVoiceInterviewRealtimeSessionConfig({
  env,
  groundingBrief,
  scope,
  traceConfig,
}: {
  env: VoiceInterviewEnv;
  groundingBrief?: ScopedDocumentationGroundingBrief | null;
  scope: VoiceInterviewScope;
  traceConfig?: VoiceInterviewRealtimeTracingConfig;
}): RealtimeClientSecretSessionConfig {
  const sessionPrompt = buildVoiceInterviewPrompt(scope, {
    groundingBrief,
  });

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
  groundingBrief,
  scope,
  traceConfig,
}: {
  groundingBrief?: ScopedDocumentationGroundingBrief | null;
  scope: VoiceInterviewScope;
  traceConfig?: VoiceInterviewRealtimeTracingConfig;
}): Promise<VoiceInterviewRealtimeBootstrap> {
  const env = getVoiceInterviewEnv();
  const client = getServerOpenAiClient();
  const totalStartedAt = nowMs();
  const openAiBootstrapStartedAt = nowMs();
  const sessionConfig = buildVoiceInterviewRealtimeSessionConfig({
    env,
    groundingBrief,
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
    runtime: buildRealtimeVoiceInterviewRuntimeDescriptor(env),
    timingsMs: {
      openAiBootstrap: openAiBootstrapMs,
      total: roundDurationMs(nowMs() - totalStartedAt),
    },
    transport: {
      clientSecret: {
        expiresAt: session.expires_at,
        value: session.value,
      },
      openAiSessionId,
      type: "realtime_webrtc",
    },
  };
}
