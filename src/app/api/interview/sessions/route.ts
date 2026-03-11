import { NextResponse } from "next/server";

import {
  createVoiceInterviewBrowserBootstrap,
  isVoiceInterviewBootstrapTimeoutError,
} from "@/lib/ai/voice-agent";
import type {
  CreateVoiceInterviewSessionConflictResponse,
  CreateVoiceInterviewSessionRequest,
  CreateVoiceInterviewSessionResponse,
} from "@/lib/interview/voice-interview-api";
import { buildVoiceInterviewTraceConfig } from "@/lib/interview/voice-interview-observability";
import {
  createInterviewSessionRecord,
  ensureInterviewSessionUserProfile,
  getBlockingInterviewSessionForUser,
  LiveInterviewSessionConflictError,
  markInterviewSessionFailed,
  markInterviewSessionReady,
  VOICE_INTERVIEW_PERSISTENCE_VERSION,
  VOICE_INTERVIEW_PROMPT_VERSION,
  VOICE_INTERVIEW_SEARCH_POLICY_VERSION,
  VOICE_INTERVIEW_TRANSPORT_VERSION,
} from "@/lib/interview/voice-interview-sessions";
import { resolveVoiceInterviewScope } from "@/lib/interview/voice-scope";
import {
  parseInterviewRequestBody,
  requireAuthenticatedInterviewRequest,
} from "@/app/api/interview/sessions/_lib/route-helpers";
import { createInterviewSessionSchema } from "@/app/api/interview/sessions/_lib/schemas";

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

function createLiveSessionConflictResponse(
  blockingSession: CreateVoiceInterviewSessionConflictResponse["blockingSession"],
) {
  return NextResponse.json(
    {
      blockingSession,
      error:
        "A live interview session is already in progress for this account. End the existing session or wait for it to expire.",
      errorCode: "live_session_exists",
    } satisfies CreateVoiceInterviewSessionConflictResponse,
    { status: 409 },
  );
}

export async function POST(request: Request) {
  const requestStartedAt = nowMs();
  const parsedPayload = await parseInterviewRequestBody(
    request,
    createInterviewSessionSchema,
    "Invalid interview session payload.",
  );

  if ("response" in parsedPayload) {
    return NextResponse.json(
      {
        error: "Invalid interview session payload.",
        errorCode: "invalid_payload",
      },
      { status: 400 },
    );
  }

  const authResult = await requireAuthenticatedInterviewRequest(() =>
    NextResponse.json(
      {
        error: "You must be signed in to start a mock interview.",
        errorCode: "unauthorized",
      },
      { status: 401 },
    ),
  );

  if ("response" in authResult) {
    return authResult.response;
  }
  const payload: CreateVoiceInterviewSessionRequest = parsedPayload.data;
  const { supabase, user } = authResult;

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

  try {
    const blockingSession = await getBlockingInterviewSessionForUser({
      supabase,
      userId: user.id,
    });

    if (blockingSession) {
      return createLiveSessionConflictResponse(blockingSession);
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: toErrorMessage(error),
        errorCode: "live_session_guard_failed",
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
    const trace = buildVoiceInterviewTraceConfig({
      persistenceVersion: VOICE_INTERVIEW_PERSISTENCE_VERSION,
      promptVersion: VOICE_INTERVIEW_PROMPT_VERSION,
      scopeSlug: scope.slug,
      scopeType: scope.scopeType,
      searchPolicyVersion: VOICE_INTERVIEW_SEARCH_POLICY_VERSION,
      sessionId: localSession.id,
      transportVersion: VOICE_INTERVIEW_TRANSPORT_VERSION,
    });

    const bootstrap = await createVoiceInterviewBrowserBootstrap({
      scope,
      traceConfig: {
        group_id: trace.groupId ?? undefined,
        metadata: trace.metadata,
        workflow_name: trace.workflowName ?? undefined,
      },
    });

    const markReadyStartedAt = nowMs();
    await markInterviewSessionReady({
      clientSecretExpiresAt: new Date(
        bootstrap.clientSecret.expiresAt * 1000,
      ).toISOString(),
      model: bootstrap.realtime.model,
      openAiSessionId: bootstrap.realtime.openAiSessionId,
      sessionId: localSession.id,
      supabase,
      trace,
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
    if (error instanceof LiveInterviewSessionConflictError) {
      let blockingSession = error.blockingSession;

      if (!blockingSession) {
        try {
          blockingSession = await getBlockingInterviewSessionForUser({
            supabase,
            userId: user.id,
          });
        } catch (guardError) {
          return NextResponse.json(
            {
              error: toErrorMessage(guardError),
              errorCode: "live_session_guard_failed",
            },
            { status: 500 },
          );
        }
      }

      if (blockingSession) {
        return createLiveSessionConflictResponse(blockingSession);
      }

      return NextResponse.json(
        {
          error:
            "A live interview session is already in progress for this account.",
          errorCode: "live_session_exists",
        },
        { status: 409 },
      );
    }

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
