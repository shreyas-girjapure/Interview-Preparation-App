import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createVoiceInterviewBrowserBootstrap,
  isVoiceInterviewBootstrapTimeoutError,
} from "@/lib/ai/voice-agent";
import type {
  CreateVoiceInterviewSessionRequest,
  CreateVoiceInterviewSessionResponse,
} from "@/lib/interview/voice-interview-api";
import {
  createInterviewSessionRecord,
  ensureInterviewSessionUserProfile,
  markInterviewSessionFailed,
  markInterviewSessionReady,
} from "@/lib/interview/voice-interview-sessions";
import { resolveVoiceInterviewScope } from "@/lib/interview/voice-scope";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createInterviewSessionSchema = z
  .object({
    scopeSlug: z.string().trim().min(1),
    scopeType: z.enum(["topic", "playlist", "question"]),
  })
  .strict() satisfies z.ZodType<CreateVoiceInterviewSessionRequest>;

export const dynamic = "force-dynamic";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function roundDurationMs(durationMs: number) {
  return Math.max(0, Math.round(durationMs));
}

function isMissingOpenAiEnvError(error: unknown) {
  return error instanceof Error && error.message.includes("OPENAI_API_KEY");
}

export async function POST(request: Request) {
  const requestStartedAt = nowMs();
  let payload: z.infer<typeof createInterviewSessionSchema>;

  try {
    payload = createInterviewSessionSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      {
        error: "Invalid interview session payload.",
        errorCode: "invalid_payload",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error: "You must be signed in to start a mock interview.",
        errorCode: "unauthorized",
      },
      { status: 401 },
    );
  }

  const scope = await resolveVoiceInterviewScope({
    scopeSlug: payload.scopeSlug,
    scopeType: payload.scopeType,
  });

  if (!scope) {
    return NextResponse.json(
      {
        error: `The ${payload.scopeType} scope could not be found.`,
        errorCode: "invalid_scope",
      },
      { status: 404 },
    );
  }

  const profileSyncStartedAt = nowMs();
  let profileSyncMs: number | undefined;

  try {
    await ensureInterviewSessionUserProfile(supabase, user);
    profileSyncMs = roundDurationMs(nowMs() - profileSyncStartedAt);
  } catch (error) {
    return NextResponse.json(
      {
        error: toErrorMessage(error),
        errorCode: "profile_sync_failed",
      },
      { status: 500 },
    );
  }

  let localSessionId: string | null = null;
  let localSessionCreateMs: number | undefined;

  try {
    const localSessionCreateStartedAt = nowMs();
    const localSession = await createInterviewSessionRecord({
      scope,
      supabase,
      userId: user.id,
    });
    localSessionId = localSession.id;
    localSessionCreateMs = roundDurationMs(
      nowMs() - localSessionCreateStartedAt,
    );

    const bootstrap = await createVoiceInterviewBrowserBootstrap(scope);

    const markReadyStartedAt = nowMs();
    await markInterviewSessionReady({
      clientSecretExpiresAt: new Date(
        bootstrap.clientSecret.expiresAt * 1000,
      ).toISOString(),
      model: bootstrap.realtime.model,
      openAiSessionId: bootstrap.realtime.openAiSessionId,
      sessionId: localSession.id,
      supabase,
      transcriptionModel: bootstrap.realtime.transcriptionModel,
      voice: bootstrap.realtime.voice,
    });
    const markReadyMs = roundDurationMs(nowMs() - markReadyStartedAt);

    return NextResponse.json(
      {
        localSession: {
          id: localSession.id,
          scopeSlug: scope.slug,
          scopeTitle: scope.title,
          scopeType: scope.scopeType,
        },
        ...bootstrap,
        timingsMs: {
          ...bootstrap.timingsMs,
          localSessionCreate: localSessionCreateMs,
          markReady: markReadyMs,
          profileSync: profileSyncMs,
          total: roundDurationMs(nowMs() - requestStartedAt),
        },
      } satisfies CreateVoiceInterviewSessionResponse,
      { status: 201 },
    );
  } catch (error) {
    const isTimeout = isVoiceInterviewBootstrapTimeoutError(error);
    const errorCode = isMissingOpenAiEnvError(error)
      ? "openai_env_missing"
      : isTimeout
        ? "openai_bootstrap_timeout"
        : "openai_bootstrap_failed";
    const message = isMissingOpenAiEnvError(error)
      ? "Voice interview is not configured on the server."
      : isTimeout
        ? "Voice interview bootstrap timed out before the realtime session was ready."
        : toErrorMessage(error);

    if (localSessionId) {
      try {
        await markInterviewSessionFailed({
          errorCode,
          errorMessage: message,
          sessionId: localSessionId,
          supabase,
        });
      } catch (markFailedError) {
        console.error(
          "Unable to mark interview session bootstrap as failed",
          markFailedError,
        );
      }
    }

    return NextResponse.json(
      {
        error: message,
        errorCode,
      },
      {
        status: isMissingOpenAiEnvError(error) ? 503 : isTimeout ? 504 : 502,
      },
    );
  }
}
