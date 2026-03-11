import { NextResponse } from "next/server";

import {
  buildChainedVoiceTranscriptItems,
  executeChainedVoiceTurn,
  getDefaultChainedVoiceRuntimeProfile,
  listChainedVoiceRuntimeProfiles,
  supportsChainedVoiceMimeType,
} from "@/lib/ai/voice-runtimes/chained-voice";
import type { CreateInterviewTurnResponse } from "@/lib/interview/voice-interview-api";
import type { VoiceInterviewTelemetryEventRequest } from "@/lib/interview/voice-interview-observability";
import {
  getInterviewSessionRuntimeContext,
  persistInterviewSessionEvents,
  updateInterviewSessionState,
} from "@/lib/interview/voice-interview-sessions";
import {
  requireAuthenticatedInterviewSessionRequest,
  type InterviewSessionRouteContext,
  toInterviewSessionRouteErrorResponse,
} from "@/app/api/interview/sessions/_lib/route-helpers";

export const dynamic = "force-dynamic";

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function roundDurationMs(durationMs: number) {
  return Math.max(0, Math.round(durationMs));
}

function buildServerTurnTelemetryEvent({
  eventName,
  payload,
  sessionId,
}: {
  eventName: string;
  payload: Record<string, string | number | boolean | null>;
  sessionId: string;
}): VoiceInterviewTelemetryEventRequest {
  const recordedAt = new Date().toISOString();

  return {
    eventKey: `${eventName}:${sessionId}:${recordedAt}`,
    eventName,
    eventSource: "server",
    payload,
    recordedAt,
  };
}

function toTrimmedString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: Request,
  context: InterviewSessionRouteContext,
) {
  const routeAccess =
    await requireAuthenticatedInterviewSessionRequest(context);

  if ("response" in routeAccess) {
    return routeAccess.response;
  }

  const { sessionId, supabase } = routeAccess;
  const requestStartedAt = nowMs();

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const clientTurnId = toTrimmedString(formData.get("clientTurnId"));
    const mimeTypeField = toTrimmedString(formData.get("mimeType"));

    if (!(audio instanceof File) || audio.size <= 0) {
      return NextResponse.json(
        {
          error: "A committed audio turn is required.",
        },
        { status: 400 },
      );
    }

    if (!clientTurnId) {
      return NextResponse.json(
        {
          error: "A clientTurnId is required.",
        },
        { status: 400 },
      );
    }

    const runtimeContext = await getInterviewSessionRuntimeContext({
      sessionId,
      supabase,
    });

    if (runtimeContext.runtimeKind !== "chained_voice") {
      return NextResponse.json(
        {
          error:
            "This interview session is not running the chained voice lane.",
        },
        { status: 409 },
      );
    }

    if (
      runtimeContext.session.state === "cancelled" ||
      runtimeContext.session.state === "completed" ||
      runtimeContext.session.state === "failed"
    ) {
      return NextResponse.json(
        {
          error: `Interview session is already ${runtimeContext.session.state}.`,
        },
        { status: 409 },
      );
    }

    const profiles = listChainedVoiceRuntimeProfiles();
    const profile =
      (runtimeContext.runtimeProfileId &&
      runtimeContext.runtimeProfileId in profiles
        ? profiles[runtimeContext.runtimeProfileId as keyof typeof profiles]
        : null) ?? getDefaultChainedVoiceRuntimeProfile();
    const resolvedMimeType = mimeTypeField || audio.type;

    if (
      resolvedMimeType &&
      !supportsChainedVoiceMimeType(profile, resolvedMimeType)
    ) {
      return NextResponse.json(
        {
          error:
            "The committed audio format is not supported for chained voice turns.",
        },
        { status: 400 },
      );
    }

    if (runtimeContext.session.state === "ready") {
      await updateInterviewSessionState({
        sessionId,
        state: "active",
        supabase,
      });
    }

    const execution = await executeChainedVoiceTurn({
      audioFile: audio,
      profile,
      scope: runtimeContext.scope,
      transcriptRows: runtimeContext.transcriptRows,
    });
    const transcriptItems = buildChainedVoiceTranscriptItems({
      assistantText: execution.assistantText,
      clientTurnId,
      previousItemId:
        runtimeContext.transcriptRows.length > 0
          ? runtimeContext.transcriptRows[
              runtimeContext.transcriptRows.length - 1
            ].item_id
          : null,
      sequenceStart: runtimeContext.transcriptRows.length,
      sessionStartedAt: runtimeContext.startedAt,
      userTranscript: execution.userTranscript,
    });
    await persistInterviewSessionEvents({
      events: [
        buildServerTurnTelemetryEvent({
          eventName: "server_turn_completed",
          payload: {
            mimeType: resolvedMimeType || null,
            textMs: execution.timingsMs.text,
            totalMs: execution.timingsMs.total,
            transcriptionMs: execution.timingsMs.transcription,
            ttsMs: execution.timingsMs.tts,
          },
          sessionId,
        }),
      ],
      finalizedItems: [
        transcriptItems.userTranscriptItem,
        transcriptItems.assistantTranscriptItem,
      ],
      sessionId,
      supabase,
      usageEvents: execution.usageEvents,
    });

    return NextResponse.json(
      {
        assistantAudio: {
          base64: execution.assistantAudioBase64,
          mimeType: "audio/mpeg",
          voice: profile.voice,
        },
        assistantTranscriptItem: transcriptItems.assistantTranscriptItem,
        ok: true,
        runtimeKind: "chained_voice",
        timingsMs: {
          ...execution.timingsMs,
          total: roundDurationMs(nowMs() - requestStartedAt),
        },
        usageEvents: execution.usageEvents,
        userTranscriptItem: transcriptItems.userTranscriptItem,
      } satisfies CreateInterviewTurnResponse,
      { status: 200 },
    );
  } catch (error) {
    try {
      await persistInterviewSessionEvents({
        events: [
          buildServerTurnTelemetryEvent({
            eventName: "server_turn_failed",
            payload: {
              message:
                error instanceof Error ? error.message : "Unknown turn failure",
              totalMs: roundDurationMs(nowMs() - requestStartedAt),
            },
            sessionId,
          }),
        ],
        sessionId,
        supabase,
      });
    } catch (telemetryError) {
      console.error(
        "Unable to persist chained voice failure telemetry",
        telemetryError,
      );
    }

    return toInterviewSessionRouteErrorResponse(
      error,
      "Unable to execute interview turn.",
    );
  }
}
