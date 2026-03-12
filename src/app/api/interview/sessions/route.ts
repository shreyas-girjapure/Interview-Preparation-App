import { NextResponse } from "next/server";

import {
  createVoiceInterviewBrowserBootstrap,
  isVoiceInterviewBootstrapTimeoutError,
} from "@/lib/ai/voice-agent";
import {
  buildChainedVoiceRuntimeDescriptor,
  buildChainedVoiceTransport,
  createChainedVoiceOpeningTurn,
  getDefaultChainedVoiceRuntimeProfile,
  supportsChainedVoiceMimeType,
} from "@/lib/ai/voice-runtimes/chained-voice";
import { getVoiceInterviewEnv } from "@/lib/env";
import type {
  CreateVoiceInterviewSessionConflictResponse,
  CreateVoiceInterviewSessionRequest,
  CreateVoiceInterviewSessionResponse,
  VoiceInterviewBrowserCapabilityReport,
  VoiceInterviewRuntimeDescriptor,
  VoiceInterviewRuntimePreference,
} from "@/lib/interview/voice-interview-api";
import { buildVoiceInterviewTraceConfig } from "@/lib/interview/voice-interview-observability";
import {
  createInterviewSessionRecord,
  ensureInterviewSessionUserProfile,
  getBlockingInterviewSessionForUser,
  LiveInterviewSessionConflictError,
  markInterviewSessionFailed,
  markInterviewSessionReady,
  persistInterviewSessionEvents,
  VOICE_INTERVIEW_PERSISTENCE_VERSION,
  VOICE_INTERVIEW_PROMPT_VERSION,
  VOICE_INTERVIEW_SEARCH_POLICY_VERSION,
  VOICE_INTERVIEW_TRANSPORT_VERSION,
} from "@/lib/interview/voice-interview-sessions";
import { prepareScopedDocumentationGrounding } from "@/lib/interview/scoped-documentation-search";
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

function resolveRequestedRuntimePreference(
  requestedPreference: VoiceInterviewRuntimePreference | undefined,
) {
  const env = getVoiceInterviewEnv();
  const defaultPreference = env.VOICE_INTERVIEW_DEFAULT_RUNTIME_PREFERENCE;

  if (!requestedPreference || requestedPreference === "auto") {
    return defaultPreference === "auto" ? "realtime_sts" : defaultPreference;
  }

  return requestedPreference;
}

function browserSupportsChainedVoice(
  capabilities: VoiceInterviewBrowserCapabilityReport | undefined,
) {
  if (!capabilities?.hasMediaRecorder || !capabilities.hasAudioContext) {
    return false;
  }

  const profile = getDefaultChainedVoiceRuntimeProfile();
  return capabilities.supportedMimeTypes.some((mimeType) =>
    supportsChainedVoiceMimeType(profile, mimeType),
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

    const requestedPreference = resolveRequestedRuntimePreference(
      payload.runtimePreference,
    );
    const selectedRuntime =
      requestedPreference === "chained_voice" &&
      browserSupportsChainedVoice(payload.capabilities)
        ? "chained_voice"
        : "realtime_sts";
    const selectionSource: VoiceInterviewRuntimeDescriptor["selectionSource"] =
      selectedRuntime !== requestedPreference
        ? "fallback"
        : payload.runtimePreference && payload.runtimePreference !== "auto"
          ? "user_preference"
          : "auto_policy";

    const trace = buildVoiceInterviewTraceConfig({
      persistenceVersion: VOICE_INTERVIEW_PERSISTENCE_VERSION,
      promptVersion: VOICE_INTERVIEW_PROMPT_VERSION,
      runtimeKind: selectedRuntime,
      scopeSlug: scope.slug,
      scopeType: scope.scopeType,
      searchPolicyVersion: VOICE_INTERVIEW_SEARCH_POLICY_VERSION,
      sessionId: localSession.id,
      transportVersion: VOICE_INTERVIEW_TRANSPORT_VERSION,
    });
    const grounding = await prepareScopedDocumentationGrounding(scope);

    const bootstrap =
      selectedRuntime === "chained_voice"
        ? await (async () => {
            const profile = getDefaultChainedVoiceRuntimeProfile();
            const openingTurn = await createChainedVoiceOpeningTurn({
              groundingBrief: grounding.brief,
              profile,
              scope,
              sessionStartedAt: null,
            });

            return {
              openingTurn: {
                assistantAudio: openingTurn.assistantAudio,
                assistantTranscriptItem: openingTurn.assistantTranscriptItem,
                timingsMs: openingTurn.timingsMs,
              },
              openingUsageEvents: openingTurn.usageEvents,
              runtime: buildChainedVoiceRuntimeDescriptor({
                profile,
                selectionSource,
              }),
              timingsMs: {
                total: openingTurn.timingsMs.total,
              },
              transport: buildChainedVoiceTransport({
                profile,
                sessionId: localSession.id,
              }),
            };
          })()
        : await createVoiceInterviewBrowserBootstrap({
            groundingBrief: grounding.brief,
            scope,
            traceConfig: {
              group_id: trace.groupId ?? undefined,
              metadata: trace.metadata,
              workflow_name: trace.workflowName ?? undefined,
            },
          }).then((result) => ({
            ...result,
            openingTurn: undefined,
            openingUsageEvents: undefined,
            runtime: {
              ...result.runtime,
              selectionSource,
            },
          }));

    const markReadyStartedAt = nowMs();
    await markInterviewSessionReady({
      grounding,
      runtime: bootstrap.runtime,
      sessionId: localSession.id,
      supabase,
      trace,
      transport: bootstrap.transport,
    });

    if (bootstrap.openingTurn) {
      await persistInterviewSessionEvents({
        finalizedItems: [bootstrap.openingTurn.assistantTranscriptItem],
        sessionId: localSession.id,
        supabase,
        usageEvents: bootstrap.openingUsageEvents,
      });
    }

    const markReadyMs = roundDurationMs(nowMs() - markReadyStartedAt);

    return NextResponse.json(
      {
        localSession: {
          id: localSession.id,
          scopeSlug: scope.slug,
          scopeTitle: scope.title,
          scopeType: scope.scopeType,
        },
        openingTurn: bootstrap.openingTurn,
        runtime: bootstrap.runtime,
        timingsMs: {
          ...bootstrap.timingsMs,
          groundingWarmup: grounding.durationMs,
          localSessionCreate: localSessionCreateMs,
          markReady: markReadyMs,
          profileSync: profileSyncMs,
          total: roundDurationMs(nowMs() - requestStartedAt),
        },
        transport: bootstrap.transport,
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
