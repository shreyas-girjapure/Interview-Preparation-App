import { z } from "zod";

import type {
  CancelInterviewSessionRequest,
  CompleteInterviewSessionRequest,
  CreateVoiceInterviewSessionRequest,
  PersistInterviewEventsRequest,
  UpdateVoiceInterviewSessionRequest,
} from "@/lib/interview/voice-interview-api";

const SESSION_SCOPE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_EVENT_ENTRIES_PER_REQUEST = 100;
const MAX_FINALIZED_ITEMS_PER_REQUEST = 200;
const MAX_USAGE_ENTRIES_PER_REQUEST = 100;
const MAX_JSON_OBJECT_ENTRIES = 32;
const MAX_SMALL_TEXT_LENGTH = 128;
const MAX_MEDIUM_TEXT_LENGTH = 512;
const MAX_LARGE_TEXT_LENGTH = 4_000;
const MAX_TRANSCRIPT_TEXT_LENGTH = 8_000;

function requiredTrimmedString(maxLength: number) {
  return z.string().trim().min(1).max(maxLength);
}

function optionalTrimmedString(maxLength: number) {
  return requiredTrimmedString(maxLength).optional();
}

function nullableOptionalTrimmedString(maxLength: number) {
  return requiredTrimmedString(maxLength).nullable().optional();
}

function boundedRecord<T extends z.ZodTypeAny>(
  valueSchema: T,
  maxEntries: number,
) {
  return z
    .record(z.string().min(1).max(MAX_SMALL_TEXT_LENGTH), valueSchema)
    .superRefine((value, ctx) => {
      if (Object.keys(value).length > maxEntries) {
        ctx.addIssue({
          code: "custom",
          message: `Must contain at most ${maxEntries} entries.`,
        });
      }
    });
}

const payloadValueSchema = z.union([
  z.string().max(MAX_LARGE_TEXT_LENGTH),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const interviewSessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

export const createInterviewSessionSchema = z
  .object({
    scopeSlug: z
      .string()
      .trim()
      .max(MAX_SMALL_TEXT_LENGTH)
      .regex(SESSION_SCOPE_SLUG_PATTERN),
    scopeType: z.enum(["topic", "playlist", "question"]),
  })
  .strict() satisfies z.ZodType<CreateVoiceInterviewSessionRequest>;

export const updateInterviewSessionSchema = z
  .object({
    errorCode: nullableOptionalTrimmedString(MAX_SMALL_TEXT_LENGTH),
    errorMessage: nullableOptionalTrimmedString(MAX_LARGE_TEXT_LENGTH),
    state: z.enum(["active", "completed", "failed", "cancelled"]),
  })
  .strict() satisfies z.ZodType<UpdateVoiceInterviewSessionRequest>;

export const transcriptCitationSchema = z
  .object({
    confidence: z.number().finite().nullable().optional(),
    label: optionalTrimmedString(MAX_SMALL_TEXT_LENGTH),
    publishedAt: z.string().datetime().nullable().optional(),
    snippet: nullableOptionalTrimmedString(MAX_LARGE_TEXT_LENGTH),
    source: requiredTrimmedString(MAX_MEDIUM_TEXT_LENGTH),
    title: optionalTrimmedString(MAX_MEDIUM_TEXT_LENGTH),
    url: z.string().trim().url().max(2_048),
  })
  .strict();

export const persistedTranscriptItemSchema = z
  .object({
    citations: z.array(transcriptCitationSchema).max(8).optional(),
    clientSequence: z.number().int().min(0),
    finalizedAt: z.string().datetime(),
    itemId: requiredTrimmedString(MAX_MEDIUM_TEXT_LENGTH),
    label: requiredTrimmedString(MAX_SMALL_TEXT_LENGTH),
    metaLabel: requiredTrimmedString(64),
    previousItemId: nullableOptionalTrimmedString(MAX_MEDIUM_TEXT_LENGTH),
    source: z.enum(["realtime", "system", "search"]),
    speaker: z.enum(["assistant", "user", "system"]),
    text: requiredTrimmedString(MAX_TRANSCRIPT_TEXT_LENGTH),
    tone: z.enum(["default", "search", "status", "error"]).optional(),
  })
  .strict();

export const completeInterviewMetricsSchema = z
  .object({
    assistantTurnCount: z.number().int().min(0),
    elapsedSeconds: z.number().int().min(0),
    finalizedTurnCount: z.number().int().min(0),
    persistedMessageCount: z.number().int().min(0),
    searchTurnCount: z.number().int().min(0),
    userTurnCount: z.number().int().min(0),
  })
  .strict();

export const cancelInterviewSessionSchema = z
  .object({
    finalizedItems: z
      .array(persistedTranscriptItemSchema)
      .max(MAX_FINALIZED_ITEMS_PER_REQUEST)
      .optional(),
    reason: z.enum(["user_exit", "page_unload", "retry", "setup_abort"]),
  })
  .strict() satisfies z.ZodType<CancelInterviewSessionRequest>;

export const completeInterviewSessionSchema = z
  .object({
    completionReason: z.enum(["user_end", "disconnect", "error_recovery"]),
    finalizedItems: z
      .array(persistedTranscriptItemSchema)
      .max(MAX_FINALIZED_ITEMS_PER_REQUEST),
    metrics: completeInterviewMetricsSchema,
  })
  .strict() satisfies z.ZodType<CompleteInterviewSessionRequest>;

export const telemetryEventSchema = z
  .object({
    eventKey: requiredTrimmedString(MAX_SMALL_TEXT_LENGTH),
    eventName: requiredTrimmedString(MAX_SMALL_TEXT_LENGTH),
    eventSource: z.enum(["client", "server", "policy"]),
    payload: boundedRecord(
      payloadValueSchema,
      MAX_JSON_OBJECT_ENTRIES,
    ).optional(),
    recordedAt: z.string().datetime(),
  })
  .strict();

export const usageEventSchema = z
  .object({
    model: nullableOptionalTrimmedString(MAX_MEDIUM_TEXT_LENGTH),
    rawUsage: boundedRecord(z.unknown(), MAX_JSON_OBJECT_ENTRIES).optional(),
    recordedAt: z.string().datetime(),
    runtimeKind: z.enum(["realtime_sts", "chained_voice"]).optional(),
    serviceTier: nullableOptionalTrimmedString(MAX_SMALL_TEXT_LENGTH),
    usage: boundedRecord(payloadValueSchema, MAX_JSON_OBJECT_ENTRIES),
    usageKey: requiredTrimmedString(MAX_SMALL_TEXT_LENGTH),
    usageSource: z.enum([
      "realtime_response",
      "realtime_input_transcription",
      "server_text_response",
      "server_audio_transcription",
      "server_tts",
    ]),
  })
  .strict();

export const persistInterviewEventsSchema = z
  .object({
    events: z
      .array(telemetryEventSchema)
      .max(MAX_EVENT_ENTRIES_PER_REQUEST)
      .optional(),
    finalizedItems: z
      .array(persistedTranscriptItemSchema)
      .max(MAX_FINALIZED_ITEMS_PER_REQUEST)
      .optional(),
    usageEvents: z
      .array(usageEventSchema)
      .max(MAX_USAGE_ENTRIES_PER_REQUEST)
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      "finalizedItems" in value || "events" in value || "usageEvents" in value,
    {
      message: "At least one interview event payload is required.",
    },
  ) satisfies z.ZodType<PersistInterviewEventsRequest>;

export const clientForceEndInterviewSessionSchema = z
  .object({
    reason: z.literal("duplicate_session"),
  })
  .strict();
