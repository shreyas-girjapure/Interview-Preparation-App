import type { VoiceInterviewScopeType } from "@/lib/interview/voice-scope";
import type {
  VoiceInterviewTelemetryEventRequest,
  VoiceInterviewUsageEventRequest,
} from "@/lib/interview/voice-interview-observability";

export type CreateVoiceInterviewSessionRequest = {
  scopeSlug: string;
  scopeType: VoiceInterviewScopeType;
};

export type VoiceInterviewBlockingSessionState =
  | "bootstrapping"
  | "ready"
  | "active";

export type VoiceInterviewBlockingSession = {
  id: string;
  scopeSlug: string;
  scopeTitle: string;
  scopeType: VoiceInterviewScopeType;
  staleAt: string | null;
  startedAt: string | null;
  state: VoiceInterviewBlockingSessionState;
};

export type CreateVoiceInterviewSessionConflictResponse = {
  blockingSession: VoiceInterviewBlockingSession;
  error: string;
  errorCode: "live_session_exists";
};

export type VoiceInterviewBootstrapTimingsMs = {
  localSessionCreate?: number;
  markReady?: number;
  openAiBootstrap: number;
  profileSync?: number;
  total: number;
};

export type CreateVoiceInterviewSessionResponse = {
  clientSecret: {
    expiresAt: number;
    value: string;
  };
  localSession: {
    id: string;
    scopeSlug: string;
    scopeTitle: string;
    scopeType: VoiceInterviewScopeType;
  };
  realtime: {
    model: string;
    openAiSessionId: string | null;
    transcriptionModel: string;
    voice: string;
  };
  timingsMs?: VoiceInterviewBootstrapTimingsMs;
};

export type UpdateVoiceInterviewSessionRequest = {
  errorCode?: string | null;
  errorMessage?: string | null;
  state: "active" | "completed" | "failed" | "cancelled";
};

export type VoiceInterviewPersistedTranscriptCitation = {
  confidence?: number | null;
  label?: string;
  publishedAt?: string | null;
  snippet?: string | null;
  source: string;
  title?: string;
  url: string;
};

export type VoiceInterviewPersistedTranscriptItem = {
  citations?: VoiceInterviewPersistedTranscriptCitation[];
  clientSequence: number;
  finalizedAt: string;
  itemId: string;
  label: string;
  metaLabel: string;
  previousItemId?: string | null;
  source: "realtime" | "system" | "search";
  speaker: "assistant" | "user" | "system";
  text: string;
  tone?: "default" | "search" | "status" | "error";
};

export type PersistInterviewEventsRequest = {
  events?: VoiceInterviewTelemetryEventRequest[];
  finalizedItems?: VoiceInterviewPersistedTranscriptItem[];
  usageEvents?: VoiceInterviewUsageEventRequest[];
};

export type PersistInterviewEventsResponse = {
  costStatus: "pending" | "estimated" | "estimate_failed";
  estimatedCostUsd: number | null;
  lastClientFlushAt: string;
  ok: true;
  persistedMessageCount: number;
  persistedTurnCount: number;
  recordedEventCount: number;
  recordedUsageEventCount: number;
};

export type VoiceInterviewSessionCompletionReason =
  | "user_end"
  | "disconnect"
  | "error_recovery";

export type CompleteInterviewSessionMetrics = {
  assistantTurnCount: number;
  elapsedSeconds: number;
  finalizedTurnCount: number;
  persistedMessageCount: number;
  searchTurnCount: number;
  userTurnCount: number;
};

export type CompleteInterviewSessionRequest = {
  finalizedItems: VoiceInterviewPersistedTranscriptItem[];
  metrics: CompleteInterviewSessionMetrics;
  completionReason: VoiceInterviewSessionCompletionReason;
};

export type VoiceInterviewSessionCancelReason =
  | "user_exit"
  | "page_unload"
  | "retry"
  | "setup_abort";

export type CancelInterviewSessionRequest = {
  finalizedItems?: VoiceInterviewPersistedTranscriptItem[];
  reason: VoiceInterviewSessionCancelReason;
};

export type ForceEndInterviewSessionReason =
  | "duplicate_session"
  | "stale_session"
  | "policy_update"
  | "admin_shutdown";

export type ForceEndInterviewSessionRequest = {
  reason: ForceEndInterviewSessionReason;
};

export type PersistedVoiceInterviewDebrief = {
  confidenceNotes?: string;
  nextDrill: string;
  sharpen: string;
  strengths: string;
  summary: string;
};

export type CompleteInterviewSessionResponse = {
  debrief: PersistedVoiceInterviewDebrief | null;
  debriefErrorCode?: string | null;
  debriefStatus: "failed" | "ready";
  ok: true;
  persistedMessageCount: number;
  persistedTurnCount: number;
};

export type CancelInterviewSessionResponse = {
  ok: true;
  persistedMessageCount: number;
  persistedTurnCount: number;
  state: "cancelled" | "completed" | "failed";
};

export type ForceEndInterviewSessionResponse = {
  forcedEndAt: string | null;
  forcedEndReason: ForceEndInterviewSessionReason | null;
  ok: true;
  state: "cancelled" | "completed" | "failed";
};

export type VoiceInterviewSessionHeartbeatResponse = {
  lastClientHeartbeatAt: string | null;
  ok: true;
  state:
    | "bootstrapping"
    | "ready"
    | "active"
    | "completed"
    | "failed"
    | "cancelled";
};

export type VoiceInterviewSessionDetailResponse = {
  events: Array<{
    createdAt: string;
    eventKey: string;
    eventName: string;
    eventSource: "client" | "server" | "policy";
    payload: Record<string, unknown> | null;
    recordedAt: string;
  }>;
  session: {
    completionReason: string | null;
    costBreakdown: Record<string, unknown> | null;
    costEstimatedAt: string | null;
    costNotes: unknown[] | null;
    costRateSnapshot: Record<string, unknown> | null;
    costStatus: "pending" | "estimated" | "estimate_failed";
    createdAt: string;
    debrief: PersistedVoiceInterviewDebrief | null;
    debriefErrorCode: string | null;
    debriefGeneratedAt: string | null;
    debriefStatus: string;
    diagnostics: Record<string, unknown> | null;
    estimatedCostCurrency: string | null;
    estimatedCostUsd: number | null;
    id: string;
    lastClientFlushAt: string | null;
    lastClientHeartbeatAt: string | null;
    lastDisconnectReason: string | null;
    lastUsageRecordedAt: string | null;
    metrics: Record<string, unknown> | null;
    openAiTraceEnabled: boolean;
    openAiTraceGroupId: string | null;
    openAiTraceMetadata: Record<string, unknown> | null;
    openAiTraceMode: string | null;
    openAiTraceWorkflowName: string | null;
    persistedTurnCount: number;
    forcedEndAt: string | null;
    forcedEndReason: string | null;
    retryCount: number;
    runtimeEnvironment: string | null;
    runtimePersistenceVersion: string | null;
    runtimePromptVersion: string | null;
    runtimeSearchPolicyVersion: string | null;
    runtimeTransportVersion: string | null;
    scopeSlug: string;
    scopeTitle: string;
    scopeType: VoiceInterviewScopeType;
    staleAt: string | null;
    state:
      | "bootstrapping"
      | "ready"
      | "active"
      | "completed"
      | "failed"
      | "cancelled";
    telemetryUpdatedAt: string | null;
    updatedAt: string;
    usageSummary: Record<string, unknown> | null;
  };
  transcript: VoiceInterviewPersistedTranscriptItem[];
  usageEvents: Array<{
    createdAt: string;
    currency: string;
    estimatedCostUsd: number | null;
    model: string | null;
    normalizedUsage: Record<string, unknown> | null;
    provider: string;
    rateSnapshot: Record<string, unknown> | null;
    recordedAt: string;
    runtimeKind: string;
    serviceTier: string | null;
    usageKey: string;
    usageSource: string;
  }>;
};
