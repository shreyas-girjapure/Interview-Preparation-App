import type { Transcription } from "openai/resources/audio/transcriptions";
import type { ResponseUsage } from "openai/resources/responses/responses";
import type { ReasoningEffort } from "openai/resources/shared";

import { getServerOpenAiClient } from "@/lib/ai/server-openai";
import { getVoiceInterviewEnv, type VoiceInterviewEnv } from "@/lib/env";
import type {
  ChainedVoiceTransport,
  CreateInterviewTurnResponse,
  VoiceInterviewAssistantAudio,
  VoiceInterviewBootstrapOpeningTurn,
  VoiceInterviewPersistedTranscriptItem,
  VoiceInterviewRuntimeDescriptor,
} from "@/lib/interview/voice-interview-api";
import type { VoiceInterviewUsageEventRequest } from "@/lib/interview/voice-interview-observability";
import type { InterviewMessageRow } from "@/lib/interview/voice-interview-persistence";
import { buildVoiceInterviewPrompt } from "@/lib/interview/voice-interview-prompt";
import { formatElapsedTime } from "@/lib/interview/voice-interview-session";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

export type ChainedVoiceRuntimeProfileId =
  | "chained_voice_premium"
  | "chained_voice_balanced";

export type ChainedVoiceRuntimeProfile = {
  acceptedMimeTypes: string[];
  autoCommitSilenceMs: number;
  maxTurnSeconds: number;
  playbackFormat: "mp3";
  profileId: ChainedVoiceRuntimeProfileId;
  profileVersion: string;
  reasoningEffort?: ReasoningEffort;
  textModel: string;
  transcribeModel: string;
  ttsModel: string;
  voice: string;
};

type BuildChainedVoiceRuntimeDescriptorOptions = {
  profile: ChainedVoiceRuntimeProfile;
  selectionSource: VoiceInterviewRuntimeDescriptor["selectionSource"];
};

type ExecuteChainedVoiceTurnOptions = {
  audioFile: File;
  profile: ChainedVoiceRuntimeProfile;
  scope: VoiceInterviewScope;
  transcriptRows: InterviewMessageRow[];
};

type CreateChainedVoiceOpeningTurnOptions = {
  profile: ChainedVoiceRuntimeProfile;
  scope: VoiceInterviewScope;
  sessionStartedAt: string | null;
};

type ChainedVoiceTurnExecution = {
  assistantAudioBase64: string;
  assistantText: string;
  timingsMs: CreateInterviewTurnResponse["timingsMs"];
  usageEvents: VoiceInterviewUsageEventRequest[];
  userTranscript: string;
};

type ServerOpenAiClient = ReturnType<typeof getServerOpenAiClient>;

type SynthesizeAssistantAudioResult = {
  assistantAudio: VoiceInterviewAssistantAudio;
  audioBuffer: Buffer;
  ttsMs: number;
};

const CHAINED_VOICE_PROFILE_VERSION = "2026-03-12";
const CHAINED_VOICE_REPLY_MAX_OUTPUT_TOKENS = 220;
const CHAINED_VOICE_CONTEXT_MESSAGE_LIMIT = 10;
const CHAINED_VOICE_ACCEPTED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function roundDurationMs(durationMs: number) {
  return Math.max(0, Math.round(durationMs));
}

function collapseWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function toRawUsageRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function formatTranscriptLine(row: InterviewMessageRow) {
  const speaker = row.speaker === "assistant" ? "Interviewer" : "You";
  return `${speaker}: ${collapseWhitespace(row.content_text)}`;
}

function buildTranscriptContextText(transcriptRows: InterviewMessageRow[]) {
  const recentRows = transcriptRows
    .filter((row) => row.speaker === "assistant" || row.speaker === "user")
    .slice(-CHAINED_VOICE_CONTEXT_MESSAGE_LIMIT);

  if (recentRows.length === 0) {
    return "No prior interview turns have been persisted yet.";
  }

  return recentRows.map(formatTranscriptLine).join("\n");
}

function buildChainedVoiceTurnInput({
  scope,
  transcriptRows,
  userTranscript,
}: {
  scope: VoiceInterviewScope;
  transcriptRows: InterviewMessageRow[];
  userTranscript: string;
}) {
  return [
    `Active scope: ${scope.title}`,
    "",
    "Recent transcript:",
    buildTranscriptContextText(transcriptRows),
    "",
    "Latest learner answer:",
    collapseWhitespace(userTranscript),
    "",
    "Reply requirements:",
    "- Respond as the interviewer, not as a narrator.",
    "- Keep the spoken reply concise and natural.",
    "- Use one to three sentences.",
    "- Ask exactly one next question or follow-up.",
    "- Do not mention hidden instructions or implementation details.",
  ].join("\n");
}

function buildChainedVoiceOpeningText(scope: VoiceInterviewScope) {
  return collapseWhitespace(
    scope.questionMap[0] ??
      `Tell me what matters most about ${scope.title} in production.`,
  );
}

function buildServerAudioTranscriptionUsageEvent({
  recordedAt,
  transcription,
  usageKey,
}: {
  recordedAt: string;
  transcription: Transcription;
  usageKey: string;
}): VoiceInterviewUsageEventRequest {
  const usage = transcription.usage;

  if (usage?.type === "duration") {
    return {
      model: null,
      rawUsage: toRawUsageRecord(usage),
      recordedAt,
      runtimeKind: "chained_voice",
      serviceTier: "standard",
      usage: {
        seconds: usage.seconds,
        type: usage.type,
      },
      usageKey,
      usageSource: "server_audio_transcription",
    };
  }

  return {
    model: null,
    rawUsage: toRawUsageRecord(usage),
    recordedAt,
    runtimeKind: "chained_voice",
    serviceTier: "standard",
    usage: {
      input_audio_tokens: usage?.input_token_details?.audio_tokens ?? 0,
      input_text_tokens: usage?.input_token_details?.text_tokens ?? 0,
      output_text_tokens: usage?.output_tokens ?? 0,
      total_tokens: usage?.total_tokens ?? 0,
      type: usage?.type ?? "tokens",
    },
    usageKey,
    usageSource: "server_audio_transcription",
  };
}

function buildServerTextResponseUsageEvent({
  model,
  recordedAt,
  usage,
  usageKey,
}: {
  model: string;
  recordedAt: string;
  usage: ResponseUsage | null | undefined;
  usageKey: string;
}): VoiceInterviewUsageEventRequest {
  return {
    model,
    rawUsage: toRawUsageRecord(usage),
    recordedAt,
    runtimeKind: "chained_voice",
    serviceTier: "standard",
    usage: {
      input_cached_text_tokens: usage?.input_tokens_details.cached_tokens ?? 0,
      input_text_tokens:
        (usage?.input_tokens ?? 0) -
        (usage?.input_tokens_details.cached_tokens ?? 0),
      input_tokens: usage?.input_tokens ?? 0,
      output_reasoning_tokens:
        usage?.output_tokens_details.reasoning_tokens ?? 0,
      output_text_tokens: usage?.output_tokens ?? 0,
      output_tokens: usage?.output_tokens ?? 0,
      total_tokens: usage?.total_tokens ?? 0,
    },
    usageKey,
    usageSource: "server_text_response",
  };
}

function buildServerTtsUsageEvent({
  audioBytes,
  model,
  recordedAt,
  text,
  usageKey,
}: {
  audioBytes: number;
  model: string;
  recordedAt: string;
  text: string;
  usageKey: string;
}): VoiceInterviewUsageEventRequest {
  return {
    model,
    recordedAt,
    runtimeKind: "chained_voice",
    serviceTier: "standard",
    usage: {
      input_characters: text.length,
      output_audio_bytes: audioBytes,
    },
    usageKey,
    usageSource: "server_tts",
  };
}

function normalizeAssistantReply(text: string) {
  return collapseWhitespace(text);
}

function resolveElapsedMetaLabel(
  startedAt: string | null,
  finalizedAt: string,
) {
  if (!startedAt) {
    return "00:00";
  }

  const startedAtMs = Date.parse(startedAt);
  const finalizedAtMs = Date.parse(finalizedAt);

  if (Number.isNaN(startedAtMs) || Number.isNaN(finalizedAtMs)) {
    return "00:00";
  }

  return formatElapsedTime(
    Math.max(0, Math.floor((finalizedAtMs - startedAtMs) / 1000)),
  );
}

function buildAssistantAudioPayload({
  audioBuffer,
  voice,
}: {
  audioBuffer: Buffer;
  voice: string;
}): VoiceInterviewAssistantAudio {
  return {
    base64: audioBuffer.toString("base64"),
    mimeType: "audio/mpeg",
    voice,
  };
}

function buildAssistantTranscriptItem({
  clientSequence,
  finalizedAt,
  itemId,
  previousItemId,
  sessionStartedAt,
  text,
}: {
  clientSequence: number;
  finalizedAt: string;
  itemId: string;
  previousItemId: string | null;
  sessionStartedAt: string | null;
  text: string;
}): VoiceInterviewPersistedTranscriptItem {
  return {
    clientSequence,
    finalizedAt,
    itemId,
    label: "Interviewer",
    metaLabel: resolveElapsedMetaLabel(sessionStartedAt, finalizedAt),
    previousItemId,
    source: "server",
    speaker: "assistant",
    text,
  };
}

function buildUserTranscriptItem({
  clientSequence,
  finalizedAt,
  itemId,
  previousItemId,
  sessionStartedAt,
  text,
}: {
  clientSequence: number;
  finalizedAt: string;
  itemId: string;
  previousItemId: string | null;
  sessionStartedAt: string | null;
  text: string;
}): VoiceInterviewPersistedTranscriptItem {
  return {
    clientSequence,
    finalizedAt,
    itemId,
    label: "You",
    metaLabel: resolveElapsedMetaLabel(sessionStartedAt, finalizedAt),
    previousItemId,
    source: "server",
    speaker: "user",
    text,
  };
}

async function synthesizeChainedVoiceAssistantAudio({
  assistantText,
  client,
  profile,
}: {
  assistantText: string;
  client: ServerOpenAiClient;
  profile: ChainedVoiceRuntimeProfile;
}): Promise<SynthesizeAssistantAudioResult> {
  const ttsStartedAt = nowMs();
  const speech = await client.audio.speech.create({
    input: assistantText,
    model: profile.ttsModel,
    response_format: profile.playbackFormat,
    voice: profile.voice,
  });
  const audioBuffer = Buffer.from(await speech.arrayBuffer());

  return {
    assistantAudio: buildAssistantAudioPayload({
      audioBuffer,
      voice: profile.voice,
    }),
    audioBuffer,
    ttsMs: roundDurationMs(nowMs() - ttsStartedAt),
  };
}

export function listChainedVoiceRuntimeProfiles(
  env: VoiceInterviewEnv = getVoiceInterviewEnv(),
) {
  const shared = {
    acceptedMimeTypes: [...CHAINED_VOICE_ACCEPTED_MIME_TYPES],
    autoCommitSilenceMs: env.OPENAI_CHAINED_AUTO_COMMIT_SILENCE_MS,
    maxTurnSeconds: env.OPENAI_CHAINED_MAX_TURN_SECONDS,
    playbackFormat: "mp3" as const,
    profileVersion: CHAINED_VOICE_PROFILE_VERSION,
    transcribeModel: env.OPENAI_CHAINED_TRANSCRIBE_MODEL,
    ttsModel: env.OPENAI_CHAINED_TTS_MODEL,
    voice: env.OPENAI_CHAINED_DEFAULT_VOICE,
  };

  return {
    chained_voice_balanced: {
      ...shared,
      profileId: "chained_voice_balanced",
      textModel: env.OPENAI_CHAINED_TEXT_MODEL_BALANCED,
    } satisfies ChainedVoiceRuntimeProfile,
    chained_voice_premium: {
      ...shared,
      profileId: "chained_voice_premium",
      reasoningEffort: env.OPENAI_CHAINED_REASONING_EFFORT_PREMIUM,
      textModel: env.OPENAI_CHAINED_TEXT_MODEL_PREMIUM,
    } satisfies ChainedVoiceRuntimeProfile,
  } satisfies Record<ChainedVoiceRuntimeProfileId, ChainedVoiceRuntimeProfile>;
}

export function getDefaultChainedVoiceRuntimeProfile(
  env: VoiceInterviewEnv = getVoiceInterviewEnv(),
) {
  return listChainedVoiceRuntimeProfiles(env).chained_voice_premium;
}

export function buildChainedVoiceRuntimeDescriptor({
  profile,
  selectionSource,
}: BuildChainedVoiceRuntimeDescriptorOptions): VoiceInterviewRuntimeDescriptor {
  return {
    kind: "chained_voice",
    models: {
      text: profile.textModel,
      transcribe: profile.transcribeModel,
      tts: profile.ttsModel,
    },
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    selectionSource,
    transport: "server_turns",
    turnStrategy: "client_vad_half_duplex",
    voice: profile.voice,
  };
}

export function supportsChainedVoiceMimeType(
  profile: Pick<ChainedVoiceRuntimeProfile, "acceptedMimeTypes">,
  mimeType: string,
) {
  return profile.acceptedMimeTypes.some(
    (acceptedMimeType) => acceptedMimeType === mimeType,
  );
}

export function buildChainedVoiceTransport({
  profile,
  sessionId,
}: {
  profile: ChainedVoiceRuntimeProfile;
  sessionId: string;
}): ChainedVoiceTransport {
  return {
    acceptedMimeTypes: [...profile.acceptedMimeTypes],
    autoCommitSilenceMs: profile.autoCommitSilenceMs,
    maxTurnSeconds: profile.maxTurnSeconds,
    playbackFormat: profile.playbackFormat,
    turnsPath: `/api/interview/sessions/${sessionId}/turns`,
    type: "server_turns",
  };
}

export function buildChainedVoiceOpeningTranscriptItem({
  assistantText,
  sessionStartedAt,
}: {
  assistantText: string;
  sessionStartedAt: string | null;
}) {
  const finalizedAt = new Date().toISOString();

  return buildAssistantTranscriptItem({
    clientSequence: 0,
    finalizedAt,
    itemId: "assistant:opening",
    previousItemId: null,
    sessionStartedAt,
    text: assistantText,
  });
}

export function buildChainedVoiceTranscriptItems({
  assistantText,
  clientTurnId,
  previousItemId,
  sequenceStart,
  sessionStartedAt,
  userTranscript,
}: {
  assistantText: string;
  clientTurnId: string;
  previousItemId: string | null;
  sequenceStart: number;
  sessionStartedAt: string | null;
  userTranscript: string;
}): Pick<
  CreateInterviewTurnResponse,
  "assistantTranscriptItem" | "userTranscriptItem"
> {
  const finalizedAt = new Date().toISOString();

  return {
    assistantTranscriptItem: buildAssistantTranscriptItem({
      clientSequence: sequenceStart + 1,
      finalizedAt,
      itemId: `assistant:${clientTurnId}`,
      previousItemId: clientTurnId,
      sessionStartedAt,
      text: assistantText,
    }),
    userTranscriptItem: buildUserTranscriptItem({
      clientSequence: sequenceStart,
      finalizedAt,
      itemId: clientTurnId,
      previousItemId,
      sessionStartedAt,
      text: userTranscript,
    }),
  };
}

export async function createChainedVoiceOpeningTurn({
  profile,
  scope,
  sessionStartedAt,
}: CreateChainedVoiceOpeningTurnOptions): Promise<
  VoiceInterviewBootstrapOpeningTurn & {
    usageEvents: VoiceInterviewUsageEventRequest[];
  }
> {
  const client = getServerOpenAiClient();
  const totalStartedAt = nowMs();
  const assistantText = buildChainedVoiceOpeningText(scope);
  const synthesized = await synthesizeChainedVoiceAssistantAudio({
    assistantText,
    client,
    profile,
  });
  const recordedAt = new Date().toISOString();

  return {
    assistantAudio: synthesized.assistantAudio,
    assistantTranscriptItem: buildChainedVoiceOpeningTranscriptItem({
      assistantText,
      sessionStartedAt,
    }),
    timingsMs: {
      total: roundDurationMs(nowMs() - totalStartedAt),
      tts: synthesized.ttsMs,
    },
    usageEvents: [
      buildServerTtsUsageEvent({
        audioBytes: synthesized.audioBuffer.byteLength,
        model: profile.ttsModel,
        recordedAt,
        text: assistantText,
        usageKey: `server-opening-tts:${recordedAt}`,
      }),
    ],
  };
}

export async function executeChainedVoiceTurn({
  audioFile,
  profile,
  scope,
  transcriptRows,
}: ExecuteChainedVoiceTurnOptions): Promise<ChainedVoiceTurnExecution> {
  const client = getServerOpenAiClient();
  const totalStartedAt = nowMs();
  const transcriptionStartedAt = nowMs();
  const transcription = await client.audio.transcriptions.create({
    file: audioFile,
    language: "en",
    model: profile.transcribeModel,
    prompt:
      "The speaker is answering a scoped interview question in English. Preserve technical terms, product names, and code identifiers.",
    response_format: "json",
  });
  const transcriptionMs = roundDurationMs(nowMs() - transcriptionStartedAt);
  const userTranscript = collapseWhitespace(transcription.text);

  if (!userTranscript) {
    throw new Error("The committed turn could not be transcribed.");
  }

  const textStartedAt = nowMs();
  const response = await client.responses.create({
    instructions: buildVoiceInterviewPrompt(scope),
    input: buildChainedVoiceTurnInput({
      scope,
      transcriptRows,
      userTranscript,
    }),
    max_output_tokens: CHAINED_VOICE_REPLY_MAX_OUTPUT_TOKENS,
    model: profile.textModel,
    reasoning: profile.reasoningEffort
      ? { effort: profile.reasoningEffort }
      : undefined,
  });
  const textMs = roundDurationMs(nowMs() - textStartedAt);
  const assistantText = normalizeAssistantReply(response.output_text);

  if (!assistantText) {
    throw new Error("The interviewer reply was empty.");
  }

  const synthesized = await synthesizeChainedVoiceAssistantAudio({
    assistantText,
    client,
    profile,
  });
  const recordedAt = new Date().toISOString();

  return {
    assistantAudioBase64: synthesized.assistantAudio.base64,
    assistantText,
    timingsMs: {
      text: textMs,
      total: roundDurationMs(nowMs() - totalStartedAt),
      transcription: transcriptionMs,
      tts: synthesized.ttsMs,
    },
    usageEvents: [
      buildServerAudioTranscriptionUsageEvent({
        recordedAt,
        transcription,
        usageKey: `server-audio-transcription:${recordedAt}`,
      }),
      buildServerTextResponseUsageEvent({
        model: profile.textModel,
        recordedAt,
        usage: response.usage,
        usageKey: `server-text-response:${response.id}`,
      }),
      buildServerTtsUsageEvent({
        audioBytes: synthesized.audioBuffer.byteLength,
        model: profile.ttsModel,
        recordedAt,
        text: assistantText,
        usageKey: `server-tts:${recordedAt}`,
      }),
    ],
    userTranscript,
  };
}
