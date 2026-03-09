import OpenAI from "openai";

import { getVoiceInterviewEnv } from "@/lib/env";
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

let openAiClientSingleton: OpenAI | null = null;
const VOICE_INTERVIEW_BOOTSTRAP_TIMEOUT_MS = 10_000;
const VOICE_INTERVIEW_MAX_OUTPUT_TOKENS = 220;
const VOICE_INTERVIEW_SERVER_VAD_THRESHOLD = 0.72;
const VOICE_INTERVIEW_SERVER_VAD_SILENCE_DURATION_MS = 650;

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

export async function createVoiceInterviewBrowserBootstrap(
  scope: VoiceInterviewScope,
): Promise<VoiceInterviewBrowserBootstrap> {
  const env = getVoiceInterviewEnv();
  const client = getOpenAiClient();
  const sessionPrompt = buildVoiceInterviewPrompt(scope);
  const totalStartedAt = nowMs();
  const openAiBootstrapStartedAt = nowMs();
  const sessionConfig: RealtimeClientSecretSessionConfig = {
    type: "realtime",
    model: env.OPENAI_REALTIME_MODEL,
    instructions: sessionPrompt,
    max_output_tokens: VOICE_INTERVIEW_MAX_OUTPUT_TOKENS,
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
          prefix_padding_ms: 300,
          silence_duration_ms: VOICE_INTERVIEW_SERVER_VAD_SILENCE_DURATION_MS,
          threshold: VOICE_INTERVIEW_SERVER_VAD_THRESHOLD,
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
    tracing: null,
  };

  const session = await withTimeout(
    client.realtime.clientSecrets.create({
      expires_after: {
        anchor: "created_at",
        seconds: env.OPENAI_REALTIME_CLIENT_SECRET_TTL_SECONDS,
      },
      session: sessionConfig,
    }),
    VOICE_INTERVIEW_BOOTSTRAP_TIMEOUT_MS,
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
