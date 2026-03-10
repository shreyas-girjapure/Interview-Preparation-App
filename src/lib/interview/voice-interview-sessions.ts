import type { User } from "@supabase/supabase-js";

import { buildVoiceInterviewDebrief } from "@/lib/interview/voice-interview-debrief";
import type {
  CancelInterviewSessionResponse,
  CompleteInterviewSessionMetrics,
  CompleteInterviewSessionResponse,
  ForceEndInterviewSessionReason,
  ForceEndInterviewSessionResponse,
  PersistInterviewEventsResponse,
  PersistedVoiceInterviewDebrief,
  VoiceInterviewBlockingSession,
  VoiceInterviewPersistedTranscriptItem,
  VoiceInterviewSessionHeartbeatResponse,
  VoiceInterviewSessionDetailResponse,
} from "@/lib/interview/voice-interview-api";
import {
  getInterviewMessageCounts,
  listInterviewMessages,
  upsertInterviewMessages,
  type InterviewMessageRow,
} from "@/lib/interview/voice-interview-persistence";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

type InterviewSessionState =
  | "bootstrapping"
  | "ready"
  | "active"
  | "completed"
  | "failed"
  | "cancelled";

type InterviewSessionBlockingState = "bootstrapping" | "ready" | "active";

type InterviewSessionRow = {
  completion_reason: string | null;
  created_at: string;
  debrief_error_code: string | null;
  debrief_generated_at: string | null;
  debrief_json: PersistedVoiceInterviewDebrief | null;
  debrief_status: string;
  ended_at: string | null;
  id: string;
  forced_end_at: string | null;
  forced_end_reason: ForceEndInterviewSessionReason | null;
  last_client_flush_at: string | null;
  last_client_heartbeat_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  metrics_json: Record<string, unknown> | null;
  openai_client_secret_expires_at: string | null;
  openai_model: string | null;
  openai_session_id: string | null;
  openai_transcription_model: string | null;
  openai_voice: string | null;
  persisted_turn_count: number;
  runtime_persistence_version: string | null;
  runtime_prompt_version: string | null;
  runtime_search_policy_version: string | null;
  runtime_transport_version: string | null;
  scope_slug: string;
  scope_snapshot: VoiceInterviewScope;
  scope_title: string;
  scope_type: VoiceInterviewScope["scopeType"];
  stale_at: string | null;
  started_at: string | null;
  state: InterviewSessionState;
  updated_at: string;
  user_id: string;
};

export class InterviewSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Interview session ${sessionId} was not found.`);
    this.name = "InterviewSessionNotFoundError";
  }
}

export class LiveInterviewSessionConflictError extends Error {
  readonly blockingSession: VoiceInterviewBlockingSession | null;

  constructor(blockingSession: VoiceInterviewBlockingSession | null) {
    super("A live interview session already exists for this user.");
    this.name = "LiveInterviewSessionConflictError";
    this.blockingSession = blockingSession;
  }
}

const BLOCKING_INTERVIEW_SESSION_STATES: InterviewSessionBlockingState[] = [
  "bootstrapping",
  "ready",
  "active",
];

const INTERVIEW_SESSION_POLICY_STALE_WINDOWS_MS: Record<
  InterviewSessionBlockingState,
  number
> = {
  active: 25 * 60 * 1000,
  bootstrapping: 2 * 60 * 1000,
  ready: 10 * 60 * 1000,
};

const INTERVIEW_SESSION_ONE_LIVE_INDEX =
  "interview_sessions_one_live_per_user_idx";

export const VOICE_INTERVIEW_PROMPT_VERSION = "voice-prompt-v2-2026-03-10";
export const VOICE_INTERVIEW_SEARCH_POLICY_VERSION = "docs-search-v1";
export const VOICE_INTERVIEW_PERSISTENCE_VERSION =
  "transcript-persistence-v1";
export const VOICE_INTERVIEW_TRANSPORT_VERSION = "agents-webrtc-v1";

function getUserProfileSeed(user: User) {
  const metadata = user.user_metadata as
    | {
        name?: string;
        full_name?: string;
        picture?: string;
        avatar_url?: string;
      }
    | undefined;

  return {
    avatarUrl: metadata?.avatar_url ?? metadata?.picture ?? null,
    fullName: metadata?.full_name ?? metadata?.name ?? null,
  };
}

function toIsoNow() {
  return new Date().toISOString();
}

function toIsoFromMs(epochMs: number) {
  return new Date(epochMs).toISOString();
}

function toEpochMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const epochMs = Date.parse(value);

  if (Number.isNaN(epochMs)) {
    return null;
  }

  return epochMs;
}

function minEpochMs(left: number | null, right: number | null) {
  if (left === null) {
    return right;
  }

  if (right === null) {
    return left;
  }

  return Math.min(left, right);
}

function computeInterviewSessionStaleAtMs(
  session: Pick<
    InterviewSessionRow,
    | "created_at"
    | "state"
    | "openai_client_secret_expires_at"
    | "started_at"
    | "last_client_heartbeat_at"
    | "last_client_flush_at"
    | "updated_at"
  >,
) {
  if (
    session.state !== "bootstrapping" &&
    session.state !== "ready" &&
    session.state !== "active"
  ) {
    return null;
  }

  if (session.state === "bootstrapping") {
    const createdAtMs = toEpochMs(session.created_at);

    if (createdAtMs === null) {
      return null;
    }

    return (
      createdAtMs + INTERVIEW_SESSION_POLICY_STALE_WINDOWS_MS.bootstrapping
    );
  }

  if (session.state === "ready") {
    const startedAtMs =
      toEpochMs(session.started_at) ?? toEpochMs(session.created_at);

    if (startedAtMs === null) {
      return toEpochMs(session.openai_client_secret_expires_at);
    }

    const policyWindowMs =
      startedAtMs + INTERVIEW_SESSION_POLICY_STALE_WINDOWS_MS.ready;
    const secretExpiresAtMs = toEpochMs(session.openai_client_secret_expires_at);

    return minEpochMs(policyWindowMs, secretExpiresAtMs);
  }

  const activityAtMs =
    toEpochMs(session.last_client_heartbeat_at) ??
    toEpochMs(session.last_client_flush_at) ??
    toEpochMs(session.updated_at) ??
    toEpochMs(session.started_at) ??
    toEpochMs(session.created_at);

  if (activityAtMs === null) {
    return null;
  }

  return activityAtMs + INTERVIEW_SESSION_POLICY_STALE_WINDOWS_MS.active;
}

function computeInterviewSessionStaleAt(
  session: Pick<
    InterviewSessionRow,
    | "created_at"
    | "state"
    | "openai_client_secret_expires_at"
    | "started_at"
    | "last_client_heartbeat_at"
    | "last_client_flush_at"
    | "updated_at"
  >,
) {
  const staleAtMs = computeInterviewSessionStaleAtMs(session);

  return staleAtMs === null ? null : toIsoFromMs(staleAtMs);
}

function toBlockingInterviewSession(
  session: Pick<
    InterviewSessionRow,
    "id" | "scope_slug" | "scope_title" | "scope_type" | "started_at"
  > & {
    state: InterviewSessionBlockingState;
    staleAt: string | null;
  },
): VoiceInterviewBlockingSession {
  return {
    id: session.id,
    scopeSlug: session.scope_slug,
    scopeTitle: session.scope_title,
    scopeType: session.scope_type,
    staleAt: session.staleAt,
    startedAt: session.started_at,
    state: session.state,
  };
}

function isLiveSessionUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: string;
    details?: string;
    message?: string;
  };

  if (candidate.code !== "23505") {
    return false;
  }

  const detailText = `${candidate.details ?? ""} ${candidate.message ?? ""}`;

  return detailText.includes(INTERVIEW_SESSION_ONE_LIVE_INDEX);
}

function parseDebrief(
  value: unknown,
): PersistedVoiceInterviewDebrief | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PersistedVoiceInterviewDebrief>;

  if (
    typeof candidate.summary !== "string" ||
    typeof candidate.strengths !== "string" ||
    typeof candidate.sharpen !== "string" ||
    typeof candidate.nextDrill !== "string"
  ) {
    return null;
  }

  return {
    confidenceNotes:
      typeof candidate.confidenceNotes === "string"
        ? candidate.confidenceNotes
        : undefined,
    nextDrill: candidate.nextDrill,
    sharpen: candidate.sharpen,
    strengths: candidate.strengths,
    summary: candidate.summary,
  };
}

function parseMetrics(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toCompleteDebriefStatus(value: string): "ready" | "failed" {
  return value === "ready" ? "ready" : "failed";
}

function mapMessageRow(
  message: InterviewMessageRow,
): VoiceInterviewPersistedTranscriptItem {
  return {
    citations: message.citations_json ?? undefined,
    clientSequence: message.client_sequence,
    finalizedAt: message.finalized_at,
    itemId: message.item_id,
    label: message.label,
    metaLabel: message.meta_label,
    previousItemId: message.previous_item_id,
    source: message.source,
    speaker: message.speaker,
    text: message.content_text,
    tone: message.tone ?? undefined,
  };
}

async function getInterviewSessionRow({
  sessionId,
  supabase,
}: {
  sessionId: string;
  supabase: SupabaseServerClient;
}) {
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle<InterviewSessionRow>();

  if (error) {
    throw new Error(
      `Unable to read the interview session record: ${error.message}`,
    );
  }

  if (!data) {
    throw new InterviewSessionNotFoundError(sessionId);
  }

  return data;
}

async function listBlockingInterviewSessionsForUser({
  supabase,
  userId,
}: {
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("state", BLOCKING_INTERVIEW_SESSION_STATES)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(
      `Unable to read blocking interview sessions for policy enforcement: ${error.message}`,
    );
  }

  return (data ?? []) as InterviewSessionRow[];
}

function toTerminalSessionState(
  state: InterviewSessionState,
): "cancelled" | "completed" | "failed" {
  if (state === "completed" || state === "failed") {
    return state;
  }

  return "cancelled";
}

async function forceEndInterviewSessionInternal({
  expectedStates,
  reason,
  sessionId,
  supabase,
}: {
  expectedStates?: InterviewSessionState[];
  reason: ForceEndInterviewSessionReason;
  sessionId: string;
  supabase: SupabaseServerClient;
}): Promise<ForceEndInterviewSessionResponse> {
  const session = await getInterviewSessionRow({
    sessionId,
    supabase,
  });

  if (
    session.state === "cancelled" ||
    session.state === "completed" ||
    session.state === "failed"
  ) {
    return {
      forcedEndAt: session.forced_end_at,
      forcedEndReason: session.forced_end_reason,
      ok: true,
      state: session.state,
    };
  }

  const forcedEndAt = toIsoNow();
  const completionReason =
    session.state === "active" ? "disconnect" : "setup_abort";
  let query = supabase
    .from("interview_sessions")
    .update({
      completion_reason: completionReason,
      ended_at: forcedEndAt,
      forced_end_at: forcedEndAt,
      forced_end_reason: reason,
      stale_at: null,
      state: "cancelled",
    })
    .eq("id", sessionId);

  if (expectedStates && expectedStates.length > 0) {
    query = query.in("state", expectedStates);
  }

  const { data, error } = await query
    .select("state, forced_end_reason, forced_end_at")
    .maybeSingle<Pick<
      InterviewSessionRow,
      "state" | "forced_end_reason" | "forced_end_at"
    >>();

  if (error) {
    throw new Error(`Unable to force end interview session: ${error.message}`);
  }

  if (!data) {
    const latest = await getInterviewSessionRow({
      sessionId,
      supabase,
    });

    return {
      forcedEndAt: latest.forced_end_at,
      forcedEndReason: latest.forced_end_reason,
      ok: true,
      state: toTerminalSessionState(latest.state),
    };
  }

  return {
    forcedEndAt: data.forced_end_at,
    forcedEndReason: data.forced_end_reason,
    ok: true,
    state: toTerminalSessionState(data.state),
  };
}

export async function getBlockingInterviewSessionForUser({
  supabase,
  userId,
}: {
  supabase: SupabaseServerClient;
  userId: string;
}): Promise<VoiceInterviewBlockingSession | null> {
  const rows = await listBlockingInterviewSessionsForUser({
    supabase,
    userId,
  });
  const nowMs = Date.now();

  for (const row of rows) {
    const staleAtMs = computeInterviewSessionStaleAtMs(row);
    const staleAt =
      staleAtMs === null ? computeInterviewSessionStaleAt(row) : toIsoFromMs(staleAtMs);

    if (staleAtMs !== null && staleAtMs <= nowMs) {
      await forceEndInterviewSessionInternal({
        expectedStates: BLOCKING_INTERVIEW_SESSION_STATES,
        reason: "stale_session",
        sessionId: row.id,
        supabase,
      });
      continue;
    }

    return toBlockingInterviewSession({
      id: row.id,
      scope_slug: row.scope_slug,
      scope_title: row.scope_title,
      scope_type: row.scope_type,
      staleAt,
      started_at: row.started_at,
      state: row.state as InterviewSessionBlockingState,
    });
  }

  return null;
}

export async function ensureInterviewSessionUserProfile(
  supabase: SupabaseServerClient,
  user: User,
) {
  const profileSeed = getUserProfileSeed(user);

  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: profileSeed.fullName,
      avatar_url: profileSeed.avatarUrl,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(
      `Unable to sync profile before creating the interview session: ${error.message}`,
    );
  }
}

export async function createInterviewSessionRecord({
  scope,
  supabase,
  userId,
}: {
  scope: VoiceInterviewScope;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const bootstrappingStaleAt = toIsoFromMs(
    Date.now() + INTERVIEW_SESSION_POLICY_STALE_WINDOWS_MS.bootstrapping,
  );
  const { data, error } = await supabase
    .from("interview_sessions")
    .insert({
      forced_end_at: null,
      forced_end_reason: null,
      debrief_error_code: null,
      debrief_generated_at: null,
      debrief_json: null,
      debrief_status: "pending",
      last_client_heartbeat_at: null,
      metrics_json: null,
      runtime_persistence_version: VOICE_INTERVIEW_PERSISTENCE_VERSION,
      runtime_prompt_version: VOICE_INTERVIEW_PROMPT_VERSION,
      runtime_search_policy_version: VOICE_INTERVIEW_SEARCH_POLICY_VERSION,
      runtime_transport_version: VOICE_INTERVIEW_TRANSPORT_VERSION,
      stale_at: bootstrappingStaleAt,
      user_id: userId,
      scope_type: scope.scopeType,
      scope_slug: scope.slug,
      scope_title: scope.title,
      scope_snapshot: scope,
      state: "bootstrapping",
    })
    .select("*")
    .single<InterviewSessionRow>();

  if (error || !data) {
    if (error && isLiveSessionUniqueViolation(error)) {
      throw new LiveInterviewSessionConflictError(null);
    }

    throw new Error(
      `Unable to create the interview session record: ${error?.message ?? "Unknown error"}`,
    );
  }

  return data;
}

export async function markInterviewSessionReady({
  clientSecretExpiresAt,
  model,
  openAiSessionId,
  sessionId,
  supabase,
  transcriptionModel,
  voice,
}: {
  clientSecretExpiresAt: string;
  model: string;
  openAiSessionId: string | null;
  sessionId: string;
  supabase: SupabaseServerClient;
  transcriptionModel: string;
  voice: string;
}) {
  const readyPolicyStaleAtMs =
    Date.now() + INTERVIEW_SESSION_POLICY_STALE_WINDOWS_MS.ready;
  const readyStaleAtMs = minEpochMs(
    readyPolicyStaleAtMs,
    toEpochMs(clientSecretExpiresAt),
  );

  const { error } = await supabase
    .from("interview_sessions")
    .update({
      completion_reason: null,
      debrief_error_code: null,
      debrief_generated_at: null,
      debrief_json: null,
      debrief_status: "pending",
      forced_end_at: null,
      forced_end_reason: null,
      state: "ready",
      last_client_heartbeat_at: null,
      metrics_json: null,
      openai_session_id: openAiSessionId,
      openai_model: model,
      openai_voice: voice,
      openai_transcription_model: transcriptionModel,
      openai_client_secret_expires_at: clientSecretExpiresAt,
      runtime_prompt_version: VOICE_INTERVIEW_PROMPT_VERSION,
      runtime_search_policy_version: VOICE_INTERVIEW_SEARCH_POLICY_VERSION,
      runtime_persistence_version: VOICE_INTERVIEW_PERSISTENCE_VERSION,
      runtime_transport_version: VOICE_INTERVIEW_TRANSPORT_VERSION,
      started_at: toIsoNow(),
      ended_at: null,
      last_error_code: null,
      last_error_message: null,
      last_client_flush_at: null,
      persisted_turn_count: 0,
      stale_at:
        readyStaleAtMs === null ? null : toIsoFromMs(readyStaleAtMs),
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Unable to update the interview session record: ${error.message}`,
    );
  }
}

export async function markInterviewSessionFailed({
  errorCode,
  errorMessage,
  sessionId,
  supabase,
}: {
  errorCode: string;
  errorMessage: string;
  sessionId: string;
  supabase: SupabaseServerClient;
}) {
  const { error } = await supabase
    .from("interview_sessions")
    .update({
      state: "failed",
      last_error_code: errorCode,
      last_error_message: errorMessage,
      ended_at: toIsoNow(),
      stale_at: null,
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Unable to mark the interview session as failed: ${error.message}`,
    );
  }
}

export async function updateInterviewSessionState({
  errorCode,
  errorMessage,
  sessionId,
  state,
  supabase,
}: {
  errorCode?: string | null;
  errorMessage?: string | null;
  sessionId: string;
  state: "active" | "completed" | "failed" | "cancelled";
  supabase: SupabaseServerClient;
}) {
  const now = toIsoNow();
  const activeStaleAt = toIsoFromMs(
    Date.now() + INTERVIEW_SESSION_POLICY_STALE_WINDOWS_MS.active,
  );
  const { error } = await supabase
    .from("interview_sessions")
    .update({
      state,
      last_error_code: errorCode ?? null,
      last_error_message: errorMessage ?? null,
      ended_at: state === "active" ? null : now,
      last_client_heartbeat_at: state === "active" ? now : null,
      stale_at: state === "active" ? activeStaleAt : null,
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Unable to update the interview session state: ${error.message}`,
    );
  }
}

export async function persistInterviewSessionEvents({
  finalizedItems,
  sessionId,
  supabase,
}: {
  finalizedItems: VoiceInterviewPersistedTranscriptItem[];
  sessionId: string;
  supabase: SupabaseServerClient;
}): Promise<PersistInterviewEventsResponse> {
  await getInterviewSessionRow({
    sessionId,
    supabase,
  });

  await upsertInterviewMessages({
    finalizedItems,
    sessionId,
    supabase,
  });

  const counts = await getInterviewMessageCounts({
    sessionId,
    supabase,
  });
  const lastClientFlushAt = toIsoNow();
  const { error } = await supabase
    .from("interview_sessions")
    .update({
      last_client_flush_at: lastClientFlushAt,
      persisted_turn_count: counts.persistedTurnCount,
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Unable to update interview session flush metadata: ${error.message}`,
    );
  }

  return {
    lastClientFlushAt,
    ok: true,
    persistedMessageCount: counts.persistedMessageCount,
    persistedTurnCount: counts.persistedTurnCount,
  };
}

export async function completeInterviewSession({
  completionReason,
  finalizedItems,
  metrics,
  sessionId,
  supabase,
}: {
  completionReason: "user_end" | "disconnect" | "error_recovery";
  finalizedItems: VoiceInterviewPersistedTranscriptItem[];
  metrics: CompleteInterviewSessionMetrics;
  sessionId: string;
  supabase: SupabaseServerClient;
}): Promise<CompleteInterviewSessionResponse> {
  const session = await getInterviewSessionRow({
    sessionId,
    supabase,
  });

  if (session.state === "completed") {
    const persisted = await persistInterviewSessionEvents({
      finalizedItems,
      sessionId,
      supabase,
    });

    return {
      debrief: parseDebrief(session.debrief_json),
      debriefErrorCode: session.debrief_error_code,
      debriefStatus: toCompleteDebriefStatus(session.debrief_status),
      ok: true,
      persistedMessageCount: persisted.persistedMessageCount,
      persistedTurnCount: persisted.persistedTurnCount,
    };
  }

  if (session.state === "cancelled" || session.state === "failed") {
    throw new Error(
      `Interview session is already terminal with state ${session.state}.`,
    );
  }

  const persisted = await persistInterviewSessionEvents({
    finalizedItems,
    sessionId,
    supabase,
  });
  const transcriptRows = await listInterviewMessages({
    sessionId,
    supabase,
  });
  const transcript = transcriptRows.map(mapMessageRow);
  let debriefStatus: "ready" | "failed" = "ready";
  let debriefErrorCode: string | null = null;
  let debrief: PersistedVoiceInterviewDebrief | null = null;

  try {
    debrief = buildVoiceInterviewDebrief({
      metrics,
      scopeTitle: session.scope_title,
      transcript,
    });
  } catch {
    debriefStatus = "failed";
    debriefErrorCode = "debrief_generation_failed";
  }

  const completedAt = toIsoNow();
  const { error } = await supabase
    .from("interview_sessions")
    .update({
      completion_reason: completionReason,
      debrief_error_code: debriefErrorCode,
      debrief_generated_at: debriefStatus === "ready" ? completedAt : null,
      debrief_json: debrief,
      debrief_status: debriefStatus,
      ended_at: completedAt,
      metrics_json: metrics,
      persisted_turn_count: persisted.persistedTurnCount,
      stale_at: null,
      state: "completed",
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Unable to complete interview session: ${error.message}`);
  }

  return {
    debrief,
    debriefErrorCode,
    debriefStatus,
    ok: true,
    persistedMessageCount: persisted.persistedMessageCount,
    persistedTurnCount: persisted.persistedTurnCount,
  };
}

export async function cancelInterviewSession({
  finalizedItems,
  reason,
  sessionId,
  supabase,
}: {
  finalizedItems?: VoiceInterviewPersistedTranscriptItem[];
  reason: "user_exit" | "page_unload" | "retry" | "setup_abort";
  sessionId: string;
  supabase: SupabaseServerClient;
}): Promise<CancelInterviewSessionResponse> {
  const session = await getInterviewSessionRow({
    sessionId,
    supabase,
  });
  const persisted = await persistInterviewSessionEvents({
    finalizedItems: finalizedItems ?? [],
    sessionId,
    supabase,
  });

  if (
    session.state === "cancelled" ||
    session.state === "completed" ||
    session.state === "failed"
  ) {
    return {
      ok: true,
      persistedMessageCount: persisted.persistedMessageCount,
      persistedTurnCount: persisted.persistedTurnCount,
      state: session.state,
    };
  }

  const { error } = await supabase
    .from("interview_sessions")
    .update({
      completion_reason: reason,
      ended_at: toIsoNow(),
      persisted_turn_count: persisted.persistedTurnCount,
      stale_at: null,
      state: "cancelled",
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Unable to cancel interview session: ${error.message}`);
  }

  return {
    ok: true,
    persistedMessageCount: persisted.persistedMessageCount,
    persistedTurnCount: persisted.persistedTurnCount,
    state: "cancelled",
  };
}

export async function forceEndInterviewSession({
  reason,
  sessionId,
  supabase,
}: {
  reason: ForceEndInterviewSessionReason;
  sessionId: string;
  supabase: SupabaseServerClient;
}): Promise<ForceEndInterviewSessionResponse> {
  return await forceEndInterviewSessionInternal({
    reason,
    sessionId,
    supabase,
  });
}

export async function recordInterviewSessionHeartbeat({
  sessionId,
  supabase,
}: {
  sessionId: string;
  supabase: SupabaseServerClient;
}): Promise<VoiceInterviewSessionHeartbeatResponse> {
  const session = await getInterviewSessionRow({
    sessionId,
    supabase,
  });

  if (session.state !== "active") {
    return {
      lastClientHeartbeatAt: session.last_client_heartbeat_at,
      ok: true,
      state: session.state,
    };
  }

  const heartbeatAt = toIsoNow();
  const staleAt = toIsoFromMs(
    Date.now() + INTERVIEW_SESSION_POLICY_STALE_WINDOWS_MS.active,
  );
  const { data, error } = await supabase
    .from("interview_sessions")
    .update({
      last_client_heartbeat_at: heartbeatAt,
      stale_at: staleAt,
    })
    .eq("id", sessionId)
    .eq("state", "active")
    .select("state, last_client_heartbeat_at")
    .maybeSingle<Pick<InterviewSessionRow, "state" | "last_client_heartbeat_at">>();

  if (error) {
    throw new Error(`Unable to update interview heartbeat: ${error.message}`);
  }

  if (!data) {
    const latest = await getInterviewSessionRow({
      sessionId,
      supabase,
    });

    return {
      lastClientHeartbeatAt: latest.last_client_heartbeat_at,
      ok: true,
      state: latest.state,
    };
  }

  return {
    lastClientHeartbeatAt: data.last_client_heartbeat_at,
    ok: true,
    state: data.state,
  };
}

export async function getInterviewSessionDetail({
  sessionId,
  supabase,
}: {
  sessionId: string;
  supabase: SupabaseServerClient;
}): Promise<VoiceInterviewSessionDetailResponse> {
  const session = await getInterviewSessionRow({
    sessionId,
    supabase,
  });
  const transcriptRows = await listInterviewMessages({
    sessionId,
    supabase,
  });

  return {
    session: {
      completionReason: session.completion_reason,
      createdAt: session.created_at,
      debrief: parseDebrief(session.debrief_json),
      debriefErrorCode: session.debrief_error_code,
      debriefGeneratedAt: session.debrief_generated_at,
      debriefStatus: session.debrief_status,
      forcedEndAt: session.forced_end_at,
      forcedEndReason: session.forced_end_reason,
      id: session.id,
      lastClientFlushAt: session.last_client_flush_at,
      lastClientHeartbeatAt: session.last_client_heartbeat_at,
      metrics: parseMetrics(session.metrics_json),
      persistedTurnCount: session.persisted_turn_count,
      runtimePersistenceVersion: session.runtime_persistence_version,
      runtimePromptVersion: session.runtime_prompt_version,
      runtimeSearchPolicyVersion: session.runtime_search_policy_version,
      runtimeTransportVersion: session.runtime_transport_version,
      scopeSlug: session.scope_slug,
      scopeTitle: session.scope_title,
      scopeType: session.scope_type,
      staleAt: session.stale_at,
      state: session.state,
      updatedAt: session.updated_at,
    },
    transcript: transcriptRows.map(mapMessageRow),
  };
}
