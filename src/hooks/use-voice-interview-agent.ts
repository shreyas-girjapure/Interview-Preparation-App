"use client";

import {
  OpenAIRealtimeWebRTC,
  type RealtimeItem,
  type TransportEvent,
  type TransportError,
  type TransportLayerTranscriptDelta,
} from "@openai/agents/realtime";
import { useEffect, useRef, useState } from "react";

import type {
  CancelInterviewSessionRequest,
  CompleteInterviewSessionRequest,
  CompleteInterviewSessionResponse,
  CreateVoiceInterviewSessionResponse,
  ForceEndInterviewSessionReason,
  PersistInterviewEventsRequest,
  PersistedVoiceInterviewDebrief,
  UpdateVoiceInterviewSessionRequest,
  VoiceInterviewBlockingSession,
  VoiceInterviewPersistedTranscriptItem,
  VoiceInterviewSessionHeartbeatResponse,
} from "@/lib/interview/voice-interview-api";
import {
  VOICE_INTERVIEW_DEFAULT_SERVICE_TIER,
  VOICE_INTERVIEW_RUNTIME_KIND,
  type VoiceInterviewTelemetryEventRequest,
  type VoiceInterviewUsageEventRequest,
} from "@/lib/interview/voice-interview-observability";
import {
  activateVoiceInterviewSession,
  logVoiceInterviewTimings,
  nowMs,
  roundDurationMs,
  startVoiceInterviewConnectFlow,
  type VoiceInterviewClientTimingsMs,
} from "@/lib/interview/voice-interview-client-flow";
import {
  buildVoiceInterviewRuntimeSnapshot,
  buildVoiceInterviewScopedCitations,
  buildVoiceInterviewSystemTranscriptItem,
  buildVoiceInterviewUserTranscriptItem,
  mapRealtimeItemToTranscriptItem,
  removeVoiceInterviewTranscriptItem,
  upsertVoiceInterviewTranscriptItem,
} from "@/lib/interview/voice-interview-runtime";
import { toAbsoluteVoiceInterviewCitationUrl } from "@/lib/interview/voice-interview-citations";
import type {
  VoiceInterviewCompletionSummary,
  VoiceInterviewSessionSnapshot,
  VoiceInterviewStage,
  VoiceInterviewTranscriptItem,
} from "@/lib/interview/voice-interview-session";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

type UseVoiceInterviewAgentOptions = {
  scope: VoiceInterviewScope;
};

type VoiceInterviewAgentSession = {
  audioElementRef: React.RefObject<HTMLAudioElement | null>;
  canRecoverBlockingSession: boolean;
  isRecoveringBlockingSession: boolean;
  isMuted: boolean;
  isUserSpeaking: boolean;
  isAgentSpeaking: boolean;
  recoverBlockingSession: () => void;
  session: VoiceInterviewSessionSnapshot;
  stage: VoiceInterviewStage;
  start: () => void;
  cancelSetup: () => void;
  toggleMute: () => void;
  end: () => void;
  retry: () => void;
  reset: () => void;
};

type ApiErrorResponse = {
  blockingSession?: VoiceInterviewBlockingSession;
  error?: string;
  errorCode?: string;
};

class VoiceInterviewClientError extends Error {
  readonly blockingSession?: VoiceInterviewBlockingSession;
  readonly code: string;

  constructor(
    code: string,
    message: string,
    blockingSession?: VoiceInterviewBlockingSession,
  ) {
    super(message);
    this.blockingSession = blockingSession;
    this.code = code;
    this.name = "VoiceInterviewClientError";
  }
}

type BrowserTimeoutId = number;

const MICROPHONE_CONSTRAINTS = {
  audio: {
    autoGainControl: true,
    channelCount: {
      ideal: 1,
    },
    echoCancellation: true,
    noiseSuppression: true,
  },
} satisfies MediaStreamConstraints;

const AGENT_SPEAKING_IDLE_MS = 500;
const REALTIME_DISCONNECT_GRACE_MS = 3_500;
const CONNECTION_INTERRUPTED_STATUS_ID = "connection-interrupted";
const PERSIST_FLUSH_DEBOUNCE_MS = 900;
const SESSION_HEARTBEAT_INTERVAL_MS = 45_000;
const VOICE_INTERVIEW_CONTROL_CHANNEL = "voice-interview-control";

type VoiceInterviewControlMessage = {
  reason: ForceEndInterviewSessionReason;
  sessionId: string;
  type: "session-force-ended";
};

type ExperimentalAudioTrackConstraints = MediaTrackConstraints & {
  voiceIsolation?: ConstrainBoolean;
};

type ExperimentalSupportedAudioConstraints = MediaTrackSupportedConstraints & {
  voiceIsolation?: boolean;
};

function isPersistableSystemTranscriptItem(item: VoiceInterviewTranscriptItem) {
  if (item.id === CONNECTION_INTERRUPTED_STATUS_ID) {
    return false;
  }

  if (item.id.startsWith("transcription-failed-")) {
    return true;
  }

  if (item.id === "session-failure") {
    return true;
  }

  return item.tone === "error" || item.tone === "search";
}

function buildPersistableFinalizedItems(
  transcript: VoiceInterviewTranscriptItem[],
  finalizedAtById: Record<string, string>,
): VoiceInterviewPersistedTranscriptItem[] {
  const persisted: VoiceInterviewPersistedTranscriptItem[] = [];

  for (const item of transcript) {
    if (item.status === "streaming") {
      continue;
    }

    if (item.speaker === "system" && !isPersistableSystemTranscriptItem(item)) {
      continue;
    }

    const text = item.text.trim();

    if (!text) {
      continue;
    }

    finalizedAtById[item.id] ??= new Date().toISOString();
    const previousItemId =
      persisted.length > 0 ? persisted[persisted.length - 1].itemId : null;
    persisted.push({
      citations: item.citations?.map((citation) => ({
        label: citation.label,
        source: citation.source,
        title: citation.label,
        url: toAbsoluteVoiceInterviewCitationUrl(citation.href),
      })),
      clientSequence: persisted.length,
      finalizedAt: finalizedAtById[item.id],
      itemId: item.id,
      label: item.label,
      metaLabel: item.meta,
      previousItemId,
      source:
        item.speaker === "system"
          ? item.tone === "search"
            ? "search"
            : "system"
          : "realtime",
      speaker: item.speaker,
      text,
      tone: item.tone,
    });
  }

  return persisted;
}

function buildPersistedTranscriptSignature(
  persistedItems: VoiceInterviewPersistedTranscriptItem[],
) {
  return JSON.stringify(
    persistedItems.map((item) => ({
      citations: item.citations,
      clientSequence: item.clientSequence,
      itemId: item.itemId,
      previousItemId: item.previousItemId ?? null,
      source: item.source,
      text: item.text,
      tone: item.tone ?? null,
    })),
  );
}

function mapDebriefToCompletionSummary(
  debrief: PersistedVoiceInterviewDebrief | null,
): VoiceInterviewCompletionSummary | undefined {
  if (!debrief) {
    return undefined;
  }

  return {
    nextDrill: debrief.nextDrill,
    sharpen: debrief.sharpen,
    strengths: debrief.strengths,
    summary: debrief.summary,
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function stopMediaStream(mediaStream: MediaStream | null) {
  mediaStream?.getTracks().forEach((track) => track.stop());
}

function clearTimeoutRef(timeoutRef: { current: BrowserTimeoutId | null }) {
  if (timeoutRef.current === null) {
    return;
  }

  window.clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

async function optimizeMicrophoneStreamForSpeech(mediaStream: MediaStream) {
  const [audioTrack] = mediaStream.getAudioTracks();

  if (!audioTrack) {
    return;
  }

  const supported =
    navigator.mediaDevices.getSupportedConstraints() as ExperimentalSupportedAudioConstraints;
  const constraints: ExperimentalAudioTrackConstraints = {};

  if (supported.autoGainControl) {
    constraints.autoGainControl = true;
  }

  if (supported.channelCount) {
    constraints.channelCount = 1;
  }

  if (supported.echoCancellation) {
    constraints.echoCancellation = true;
  }

  if (supported.noiseSuppression) {
    constraints.noiseSuppression = true;
  }

  // Prefer browser-provided speech isolation when available.
  if (supported.voiceIsolation) {
    constraints.voiceIsolation = true;
  }

  if (Object.keys(constraints).length === 0) {
    return;
  }

  try {
    await audioTrack.applyConstraints(constraints);
  } catch (error) {
    console.warn("Unable to apply optimized microphone constraints", error);
  }
}

function upsertStatusTranscriptItem(
  transcript: VoiceInterviewTranscriptItem[],
  item: VoiceInterviewTranscriptItem,
) {
  const existingIndex = transcript.findIndex((entry) => entry.id === item.id);

  if (existingIndex < 0) {
    return [...transcript, item];
  }

  const nextTranscript = [...transcript];
  nextTranscript[existingIndex] = item;
  return nextTranscript;
}

function toApiErrorResponse(value: unknown): ApiErrorResponse | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as ApiErrorResponse;
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof VoiceInterviewClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "string"
  ) {
    return error.error;
  }

  return fallback;
}

function buildLiveSessionConflictMessage(
  blockingSession: VoiceInterviewBlockingSession | undefined,
) {
  if (!blockingSession) {
    return "A live interview session is already in progress. End the existing session or wait for it to expire before retrying.";
  }

  const startedAtSegment = blockingSession.startedAt
    ? ` Started at ${blockingSession.startedAt}.`
    : "";
  const staleAtSegment = blockingSession.staleAt
    ? ` Expected stale cutoff: ${blockingSession.staleAt}.`
    : "";

  return `A live interview is already in progress for ${blockingSession.scopeTitle}.${startedAtSegment}${staleAtSegment} End that session or wait before starting another.`;
}

function normalizeClientError(error: unknown) {
  if (error instanceof VoiceInterviewClientError) {
    return error;
  }

  if (error instanceof DOMException) {
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      return new VoiceInterviewClientError(
        "microphone_permission_denied",
        "Microphone permission was denied. Allow access and retry the interview.",
      );
    }

    if (error.name === "NotFoundError") {
      return new VoiceInterviewClientError(
        "microphone_unavailable",
        "No microphone was found on this device.",
      );
    }
  }

  return new VoiceInterviewClientError(
    "voice_interview_failed",
    toErrorMessage(
      error,
      "The voice interview could not be started. Retry the session.",
    ),
  );
}

function getTransportErrorMessage(error: TransportError) {
  return normalizeClientError(error.error);
}

function logVoiceInterviewFailure({
  attemptId,
  error,
  label,
  normalizedError,
  scopeSlug,
  sessionId,
  stage,
}: {
  attemptId: number;
  error: unknown;
  label: string;
  normalizedError?: VoiceInterviewClientError;
  scopeSlug: string;
  sessionId?: string | null;
  stage: VoiceInterviewStage;
}) {
  console.error(`[voice-interview] ${label}`, {
    attemptId,
    normalizedError: normalizedError
      ? {
          code: normalizedError.code,
          message: normalizedError.message,
        }
      : null,
    rawError: error,
    scopeSlug,
    sessionId: sessionId ?? null,
    stage,
  });
}

async function createInterviewSessionBootstrap(
  scope: VoiceInterviewScope,
  signal: AbortSignal,
) {
  const response = await fetch("/api/interview/sessions", {
    body: JSON.stringify({
      scopeSlug: scope.slug,
      scopeType: scope.scopeType,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });
  const body = (await response.json()) as
    | CreateVoiceInterviewSessionResponse
    | ApiErrorResponse;

  if (
    !response.ok ||
    !("localSession" in body) ||
    !("clientSecret" in body) ||
    !("realtime" in body)
  ) {
    const errorResponse = toApiErrorResponse(body);
    const errorCode = errorResponse?.errorCode ?? "bootstrap_failed";

    if (errorCode === "live_session_exists") {
      throw new VoiceInterviewClientError(
        "live_session_exists",
        buildLiveSessionConflictMessage(errorResponse?.blockingSession),
        errorResponse?.blockingSession,
      );
    }

    throw new VoiceInterviewClientError(
      errorCode,
      errorResponse?.error ?? "Unable to create the interview session.",
    );
  }

  return body;
}

export function useVoiceInterviewAgent({
  scope,
}: UseVoiceInterviewAgentOptions): VoiceInterviewAgentSession {
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const assistantTranscriptRef = useRef<Record<string, string>>({});
  const bootstrapAbortRef = useRef<AbortController | null>(null);
  const controlChannelRef = useRef<BroadcastChannel | null>(null);
  const conversationItemsRef = useRef<VoiceInterviewTranscriptItem[]>([]);
  const clientTimingsRef = useRef<VoiceInterviewClientTimingsMs>({});
  const elapsedSecondsRef = useRef(0);
  const finalizedAtByTranscriptIdRef = useRef<Record<string, string>>({});
  const isMutedRef = useRef(false);
  const lastPatchedStateRef = useRef<
    UpdateVoiceInterviewSessionRequest["state"] | null
  >(null);
  const lastPersistedSignatureRef = useRef("");
  const localSessionIdRef = useRef<string | null>(null);
  const realtimeModelRef = useRef<string | null>(null);
  const transcriptionModelRef = useRef<string | null>(null);
  const serviceTierRef = useRef<string>(VOICE_INTERVIEW_DEFAULT_SERVICE_TIER);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pendingTelemetryEventsRef = useRef<
    VoiceInterviewTelemetryEventRequest[]
  >([]);
  const pendingUsageEventsRef = useRef<VoiceInterviewUsageEventRequest[]>([]);
  const pendingTranscriptPreviousItemRef = useRef<
    Record<string, string | null | undefined>
  >({});
  const persistFlushTimeoutRef = useRef<BrowserTimeoutId | null>(null);
  const schedulePersistFlushRef = useRef<
    (options?: {
      force?: boolean;
      keepalive?: boolean;
      immediate?: boolean;
    }) => void
  >(() => {});
  const serverTimingsRef = useRef<
    CreateVoiceInterviewSessionResponse["timingsMs"] | undefined
  >(undefined);
  const stageRef = useRef<VoiceInterviewStage>("ready");
  const statusItemsRef = useRef<VoiceInterviewTranscriptItem[]>([]);
  const startTimestampRef = useRef<number | null>(null);
  const startupStartedAtRef = useRef<number | null>(null);
  const transcriptMetaRef = useRef<Record<string, string>>({});
  const transportCleanupRef = useRef<(() => void) | null>(null);
  const transportRef = useRef<OpenAIRealtimeWebRTC | null>(null);
  const attemptIdRef = useRef(0);
  const agentSpeakingTimeoutRef = useRef<BrowserTimeoutId | null>(null);
  const handleHeartbeatStateMismatchRef = useRef<
    (heartbeat: VoiceInterviewSessionHeartbeatResponse) => void
  >(() => {});
  const handleSessionEndedRemotelyRef = useRef<(message: string) => void>(
    () => {},
  );
  const cancelInterviewSessionRef = useRef<
    (
      sessionId: string,
      reason: CancelInterviewSessionRequest["reason"],
      options?: {
        keepalive?: boolean;
        preferBeacon?: boolean;
      },
    ) => Promise<void>
  >(async () => {});
  const disconnectFailureTimeoutRef = useRef<BrowserTimeoutId | null>(null);

  const [connectionLabel, setConnectionLabel] = useState<string | undefined>();
  const [conversationItems, setConversationItems] = useState<
    VoiceInterviewTranscriptItem[]
  >([]);
  const [completionSummary, setCompletionSummary] = useState<
    VoiceInterviewCompletionSummary | undefined
  >();
  const [blockingSession, setBlockingSession] = useState<
    VoiceInterviewBlockingSession | undefined
  >();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isRecoveringBlockingSession, setIsRecoveringBlockingSession] =
    useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [micLabel, setMicLabel] = useState<string | undefined>();
  const [stage, setStage] = useState<VoiceInterviewStage>("ready");
  const [statusItems, setStatusItems] = useState<
    VoiceInterviewTranscriptItem[]
  >([]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    conversationItemsRef.current = conversationItems;
  }, [conversationItems]);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    statusItemsRef.current = statusItems;
  }, [statusItems]);

  useEffect(() => {
    if (stage !== "connecting" && stage !== "live") {
      return;
    }

    const updateElapsed = () => {
      if (!startTimestampRef.current) {
        return;
      }

      setElapsedSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - startTimestampRef.current) / 1000),
        ),
      );
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(intervalId);
  }, [stage]);

  useEffect(() => {
    if (stage !== "connecting" && stage !== "live") {
      return;
    }

    if (!localSessionIdRef.current) {
      return;
    }

    const finalizedItems = buildPersistableFinalizedItems(
      [...statusItems, ...conversationItems],
      finalizedAtByTranscriptIdRef.current,
    );
    const signature = buildPersistedTranscriptSignature(finalizedItems);

    if (
      signature === lastPersistedSignatureRef.current &&
      !hasPendingObservabilityPayload()
    ) {
      return;
    }

    schedulePersistFlushRef.current();

    return () => {
      clearTimeoutRef(persistFlushTimeoutRef);
    };
  }, [conversationItems, stage, statusItems]);

  useEffect(() => {
    if (stage !== "live") {
      return;
    }

    const sessionId = localSessionIdRef.current;

    if (!sessionId) {
      return;
    }

    let didDispose = false;
    const sendHeartbeat = () => {
      void postInterviewSessionHeartbeat(sessionId)
        .then((heartbeat) => {
          if (didDispose) {
            return;
          }

          handleHeartbeatStateMismatchRef.current(heartbeat);
        })
        .catch((error) => {
          if (didDispose) {
            return;
          }

          console.error("Unable to send interview session heartbeat", error);
        });
    };

    sendHeartbeat();
    const intervalId = window.setInterval(
      sendHeartbeat,
      SESSION_HEARTBEAT_INTERVAL_MS,
    );

    return () => {
      didDispose = true;
      window.clearInterval(intervalId);
    };
  }, [stage]);

  function getMetaLabel() {
    if (!startTimestampRef.current) {
      return "00:00";
    }

    const totalSeconds = Math.max(
      0,
      Math.floor((Date.now() - startTimestampRef.current) / 1000),
    );
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function logTimings() {
    logVoiceInterviewTimings({
      clientTimingsMs: { ...clientTimingsRef.current },
      scopeSlug: scope.slug,
      serverTimingsMs: serverTimingsRef.current,
    });
  }

  function getTranscriptSnapshot() {
    return [...statusItemsRef.current, ...conversationItemsRef.current];
  }

  function getPersistableFinalizedItems() {
    return buildPersistableFinalizedItems(
      getTranscriptSnapshot(),
      finalizedAtByTranscriptIdRef.current,
    );
  }

  function hasPendingObservabilityPayload() {
    return (
      pendingTelemetryEventsRef.current.length > 0 ||
      pendingUsageEventsRef.current.length > 0
    );
  }

  function schedulePersistFlush(options?: {
    force?: boolean;
    keepalive?: boolean;
    immediate?: boolean;
  }) {
    if (!localSessionIdRef.current) {
      return;
    }

    clearTimeoutRef(persistFlushTimeoutRef);
    persistFlushTimeoutRef.current = window.setTimeout(
      () => {
        void persistInterviewEvents({
          force: options?.force,
          keepalive: options?.keepalive,
        }).catch((error) => {
          console.error("Unable to flush interview telemetry payload", error);
        });
      },
      options?.immediate ? 0 : PERSIST_FLUSH_DEBOUNCE_MS,
    );
  }

  schedulePersistFlushRef.current = schedulePersistFlush;

  function enqueueTelemetryEvent(event: VoiceInterviewTelemetryEventRequest) {
    pendingTelemetryEventsRef.current = [
      ...pendingTelemetryEventsRef.current.filter(
        (candidate) => candidate.eventKey !== event.eventKey,
      ),
      event,
    ];
    schedulePersistFlush();
  }

  function enqueueUsageEvent(event: VoiceInterviewUsageEventRequest) {
    pendingUsageEventsRef.current = [
      ...pendingUsageEventsRef.current.filter(
        (candidate) => candidate.usageKey !== event.usageKey,
      ),
      event,
    ];
    schedulePersistFlush();
  }

  async function persistInterviewEvents(options?: {
    finalizedItems?: VoiceInterviewPersistedTranscriptItem[];
    force?: boolean;
    keepalive?: boolean;
  }) {
    const sessionId = localSessionIdRef.current;

    if (!sessionId) {
      return;
    }

    const finalizedItems =
      options?.finalizedItems ?? getPersistableFinalizedItems();
    const signature = buildPersistedTranscriptSignature(finalizedItems);
    const telemetryEvents = [...pendingTelemetryEventsRef.current];
    const usageEvents = [...pendingUsageEventsRef.current];

    if (
      !options?.force &&
      signature === lastPersistedSignatureRef.current &&
      telemetryEvents.length === 0 &&
      usageEvents.length === 0
    ) {
      return;
    }

    const payload: PersistInterviewEventsRequest = {
      ...(telemetryEvents.length > 0 ? { events: telemetryEvents } : {}),
      finalizedItems,
      ...(usageEvents.length > 0 ? { usageEvents } : {}),
    };
    const response = await fetch(
      `/api/interview/sessions/${sessionId}/events`,
      {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        keepalive: options?.keepalive ?? false,
        method: "POST",
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const errorResponse = toApiErrorResponse(body);

      throw new VoiceInterviewClientError(
        errorResponse?.errorCode ?? "persist_events_failed",
        errorResponse?.error ??
          "Unable to persist finalized interview transcript items.",
      );
    }

    lastPersistedSignatureRef.current = signature;
    pendingTelemetryEventsRef.current =
      pendingTelemetryEventsRef.current.filter(
        (event) =>
          !telemetryEvents.some(
            (candidate) => candidate.eventKey === event.eventKey,
          ),
      );
    pendingUsageEventsRef.current = pendingUsageEventsRef.current.filter(
      (event) =>
        !usageEvents.some((candidate) => candidate.usageKey === event.usageKey),
    );
  }

  async function cancelInterviewSession(
    sessionId: string,
    reason: CancelInterviewSessionRequest["reason"],
    options?: {
      keepalive?: boolean;
      preferBeacon?: boolean;
    },
  ) {
    const finalizedItems = getPersistableFinalizedItems();
    const signature = buildPersistedTranscriptSignature(finalizedItems);
    const payload: CancelInterviewSessionRequest = {
      finalizedItems,
      reason,
    };

    if (
      options?.preferBeacon &&
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const beaconBody = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      const beaconSent = navigator.sendBeacon(
        `/api/interview/sessions/${sessionId}/cancel`,
        beaconBody,
      );

      if (beaconSent) {
        lastPersistedSignatureRef.current = signature;
        return;
      }
    }

    const response = await fetch(
      `/api/interview/sessions/${sessionId}/cancel`,
      {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        keepalive: options?.keepalive ?? false,
        method: "POST",
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const errorResponse = toApiErrorResponse(body);

      throw new VoiceInterviewClientError(
        errorResponse?.errorCode ?? "session_cancel_failed",
        errorResponse?.error ??
          "Unable to persist interview cancellation with the final transcript snapshot.",
      );
    }

    lastPersistedSignatureRef.current = signature;
  }

  cancelInterviewSessionRef.current = cancelInterviewSession;

  async function forceEndBlockingSession(sessionId: string) {
    const response = await fetch(
      `/api/interview/sessions/${sessionId}/force-end`,
      {
        body: JSON.stringify({
          reason: "duplicate_session",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const errorResponse = toApiErrorResponse(body);

      throw new VoiceInterviewClientError(
        errorResponse?.errorCode ?? "session_force_end_failed",
        errorResponse?.error ??
          "Unable to end the blocking interview session on the server.",
      );
    }

    broadcastSessionControl({
      reason: "duplicate_session",
      sessionId,
      type: "session-force-ended",
    });
  }

  async function completeInterviewSession(sessionId: string) {
    enqueueTelemetryEvent({
      eventKey: `session-complete:${sessionId}:${Date.now()}`,
      eventName: "session_complete_requested",
      eventSource: "client",
      payload: {
        elapsedSeconds: elapsedSecondsRef.current,
      },
      recordedAt: new Date().toISOString(),
    });
    await persistInterviewEvents({
      force: true,
    });

    const finalizedItems = getPersistableFinalizedItems();
    const assistantTurnCount = finalizedItems.filter(
      (item) => item.speaker === "assistant",
    ).length;
    const userTurnCount = finalizedItems.filter(
      (item) => item.speaker === "user",
    ).length;
    const finalizedTurnCount = assistantTurnCount + userTurnCount;
    const searchTurnCount = finalizedItems.filter(
      (item) => item.source === "search" || item.tone === "search",
    ).length;
    const payload: CompleteInterviewSessionRequest = {
      completionReason: "user_end",
      finalizedItems,
      metrics: {
        assistantTurnCount,
        elapsedSeconds: elapsedSecondsRef.current,
        finalizedTurnCount,
        persistedMessageCount: finalizedItems.length,
        searchTurnCount,
        userTurnCount,
      },
    };
    const response = await fetch(
      `/api/interview/sessions/${sessionId}/complete`,
      {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const errorResponse = toApiErrorResponse(body);

      throw new VoiceInterviewClientError(
        errorResponse?.errorCode ?? "session_complete_failed",
        errorResponse?.error ??
          "Unable to complete interview session with persisted transcript and debrief.",
      );
    }

    const body = (await response.json()) as
      | CompleteInterviewSessionResponse
      | ApiErrorResponse;
    const completeResponse = body as CompleteInterviewSessionResponse;

    if (!("ok" in completeResponse) || completeResponse.ok !== true) {
      const errorResponse = toApiErrorResponse(body);

      throw new VoiceInterviewClientError(
        errorResponse?.errorCode ?? "session_complete_failed",
        errorResponse?.error ??
          "The interview session completion response was invalid.",
      );
    }

    setCompletionSummary(
      mapDebriefToCompletionSummary(completeResponse.debrief),
    );
    lastPersistedSignatureRef.current =
      buildPersistedTranscriptSignature(finalizedItems);
  }

  function resetRuntimeState() {
    clearTimeoutRef(agentSpeakingTimeoutRef);
    clearTimeoutRef(disconnectFailureTimeoutRef);
    clearTimeoutRef(persistFlushTimeoutRef);
    assistantTranscriptRef.current = {};
    bootstrapAbortRef.current = null;
    clientTimingsRef.current = {};
    conversationItemsRef.current = [];
    elapsedSecondsRef.current = 0;
    finalizedAtByTranscriptIdRef.current = {};
    lastPatchedStateRef.current = null;
    lastPersistedSignatureRef.current = "";
    localSessionIdRef.current = null;
    serverTimingsRef.current = undefined;
    statusItemsRef.current = [];
    pendingTranscriptPreviousItemRef.current = {};
    pendingTelemetryEventsRef.current = [];
    pendingUsageEventsRef.current = [];
    realtimeModelRef.current = null;
    transcriptionModelRef.current = null;
    serviceTierRef.current = VOICE_INTERVIEW_DEFAULT_SERVICE_TIER;
    setConnectionLabel(undefined);
    setCompletionSummary(undefined);
    setConversationItems([]);
    setElapsedSeconds(0);
    setBlockingSession(undefined);
    setErrorMessage(undefined);
    setIsRecoveringBlockingSession(false);
    setIsMuted(false);
    setIsUserSpeaking(false);
    setIsAgentSpeaking(false);
    setMicLabel(undefined);
    setStage("ready");
    setStatusItems([]);
    startTimestampRef.current = null;
    startupStartedAtRef.current = null;
    transcriptMetaRef.current = {};
  }

  function releaseMediaAndTransportResources() {
    clearTimeoutRef(agentSpeakingTimeoutRef);
    clearTimeoutRef(disconnectFailureTimeoutRef);
    transportCleanupRef.current?.();
    transportCleanupRef.current = null;
    transportRef.current = null;
    stopMediaStream(mediaStreamRef.current);
    mediaStreamRef.current = null;
  }

  function releaseActiveResources() {
    bootstrapAbortRef.current?.abort();
    bootstrapAbortRef.current = null;
    releaseMediaAndTransportResources();
  }

  function broadcastSessionControl(message: VoiceInterviewControlMessage) {
    controlChannelRef.current?.postMessage(message);
  }

  function handleSessionEndedRemotely(message: string) {
    const sessionId = localSessionIdRef.current;
    attemptIdRef.current += 1;
    releaseActiveResources();
    setBlockingSession(undefined);
    setConnectionLabel("Session ended elsewhere");
    setErrorMessage(message);
    setIsRecoveringBlockingSession(false);
    setIsAgentSpeaking(false);
    setIsMuted(false);
    setIsUserSpeaking(false);
    setMicLabel("Released");
    setStage("failed");
    setStatusItems((current) =>
      upsertStatusTranscriptItem(
        current,
        buildVoiceInterviewSystemTranscriptItem({
          id: "session-force-ended",
          label: "Session ended",
          meta: getMetaLabel(),
          text: message,
          tone: "error",
        }),
      ),
    );
    logTimings();

    if (sessionId) {
      enqueueTelemetryEvent({
        eventKey: `session-force-ended:${sessionId}:${Date.now()}`,
        eventName: "session_force_ended_remote",
        eventSource: "policy",
        payload: {
          message,
        },
        recordedAt: new Date().toISOString(),
      });
    }

    void persistInterviewEvents({
      force: true,
      keepalive: true,
    }).catch((persistError) => {
      console.error(
        "Unable to persist finalized transcript snapshot after remote session end",
        persistError,
      );
    });
  }

  handleSessionEndedRemotelyRef.current = handleSessionEndedRemotely;

  function handleHeartbeatStateMismatch(
    heartbeat: VoiceInterviewSessionHeartbeatResponse,
  ) {
    if (
      heartbeat.state === "bootstrapping" ||
      heartbeat.state === "ready" ||
      heartbeat.state === "active"
    ) {
      return;
    }

    handleSessionEndedRemotely(
      "This interview was ended from another tab or by server policy. Start a new round to continue.",
    );
  }

  handleHeartbeatStateMismatchRef.current = handleHeartbeatStateMismatch;

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(VOICE_INTERVIEW_CONTROL_CHANNEL);
    controlChannelRef.current = channel;
    channel.onmessage = (event: MessageEvent<VoiceInterviewControlMessage>) => {
      const message = event.data;

      if (
        !message ||
        message.type !== "session-force-ended" ||
        message.sessionId !== localSessionIdRef.current
      ) {
        return;
      }

      handleSessionEndedRemotelyRef.current(
        "This interview was ended from another tab. Start a new round to continue.",
      );
    };

    return () => {
      if (controlChannelRef.current === channel) {
        controlChannelRef.current = null;
      }

      channel.close();
    };
  }, []);

  useEffect(() => {
    return () => {
      const sessionId = localSessionIdRef.current;
      const stageAtUnmount = stageRef.current;
      const shouldCancel =
        stageAtUnmount === "connecting" || stageAtUnmount === "live";

      if (shouldCancel && sessionId) {
        const reason: CancelInterviewSessionRequest["reason"] =
          stageAtUnmount === "live" ? "page_unload" : "setup_abort";

        void cancelInterviewSessionRef
          .current(sessionId, reason, {
            keepalive: true,
            preferBeacon: true,
          })
          .catch((error) => {
            console.error(
              "Unable to persist cancel interview session on page unload",
              error,
            );
          });
      }

      attemptIdRef.current += 1;
      bootstrapAbortRef.current?.abort();
      bootstrapAbortRef.current = null;
      releaseMediaAndTransportResources();
    };
  }, []);

  async function postInterviewSessionHeartbeat(
    sessionId: string,
  ): Promise<VoiceInterviewSessionHeartbeatResponse> {
    const response = await fetch(
      `/api/interview/sessions/${sessionId}/heartbeat`,
      {
        method: "POST",
      },
    );
    const body = (await response.json().catch(() => null)) as
      | VoiceInterviewSessionHeartbeatResponse
      | ApiErrorResponse
      | null;

    if (!response.ok) {
      const errorResponse = toApiErrorResponse(body);

      throw new VoiceInterviewClientError(
        errorResponse?.errorCode ?? "session_heartbeat_failed",
        errorResponse?.error ?? "Unable to update interview heartbeat.",
      );
    }

    if (!body || typeof body !== "object" || !("state" in body)) {
      throw new VoiceInterviewClientError(
        "session_heartbeat_failed",
        "The interview heartbeat response was invalid.",
      );
    }

    return body;
  }

  async function patchSessionState(
    sessionId: string,
    update: UpdateVoiceInterviewSessionRequest,
  ) {
    if (lastPatchedStateRef.current === update.state) {
      return;
    }

    const response = await fetch(`/api/interview/sessions/${sessionId}`, {
      body: JSON.stringify(update),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });

    if (!response.ok) {
      throw new VoiceInterviewClientError(
        "session_state_sync_failed",
        "The interview session state could not be synchronized.",
      );
    }

    lastPatchedStateRef.current = update.state;
  }

  async function failSession(
    error: VoiceInterviewClientError,
    attemptId: number,
    options?: {
      preserveBootstrap?: boolean;
    },
  ) {
    if (attemptId !== attemptIdRef.current) {
      return;
    }

    if (options?.preserveBootstrap) {
      releaseMediaAndTransportResources();
    } else {
      releaseActiveResources();
    }

    setBlockingSession(error.blockingSession);
    setConnectionLabel(
      error.code === "live_session_exists"
        ? "Another live session is blocking a new start"
        : "Interview session failed",
    );
    setErrorMessage(error.message);
    setIsRecoveringBlockingSession(false);
    setIsAgentSpeaking(false);
    setIsMuted(false);
    setIsUserSpeaking(false);
    setMicLabel("Released after failure");
    setStage("failed");
    setStatusItems((current) =>
      upsertStatusTranscriptItem(
        current,
        buildVoiceInterviewSystemTranscriptItem({
          id: "session-failure",
          label: "Session error",
          meta: getMetaLabel(),
          text: error.message,
          tone: "error",
        }),
      ),
    );
    logTimings();

    const sessionId = localSessionIdRef.current;

    if (!sessionId) {
      return;
    }

    enqueueTelemetryEvent({
      eventKey: `session-failed:${sessionId}:${attemptId}:${Date.now()}`,
      eventName: "session_failed",
      eventSource: "client",
      payload: {
        code: error.code,
        message: error.message,
      },
      recordedAt: new Date().toISOString(),
    });

    try {
      await persistInterviewEvents({
        force: true,
      });
    } catch (persistError) {
      console.error(
        "Unable to persist finalized transcript snapshot before failed state",
        persistError,
      );
    }

    try {
      await patchSessionState(sessionId, {
        errorCode: error.code,
        errorMessage: error.message,
        state: "failed",
      });
    } catch (stateSyncError) {
      console.error(
        "Unable to persist failed interview session state",
        stateSyncError,
      );
    }
  }

  function registerTransport(
    transport: OpenAIRealtimeWebRTC,
    attemptId: number,
  ) {
    const onItemUpdate = (item: RealtimeItem) => {
      if (attemptId !== attemptIdRef.current) {
        return;
      }

      const meta =
        transcriptMetaRef.current[item.itemId] ??
        (transcriptMetaRef.current[item.itemId] = getMetaLabel());
      const transcriptItem = mapRealtimeItemToTranscriptItem({
        assistantDelta: assistantTranscriptRef.current[item.itemId],
        item,
        meta,
      });

      if (!transcriptItem) {
        return;
      }

      if (
        item.type === "message" &&
        item.role === "assistant" &&
        item.status !== "in_progress"
      ) {
        delete assistantTranscriptRef.current[item.itemId];
      }

      setConversationItems((current) =>
        upsertVoiceInterviewTranscriptItem(
          current,
          transcriptItem,
          "previousItemId" in item ? item.previousItemId : undefined,
        ),
      );
    };

    const onItemDeleted = (item: { itemId: string }) => {
      if (attemptId !== attemptIdRef.current) {
        return;
      }

      delete assistantTranscriptRef.current[item.itemId];
      delete transcriptMetaRef.current[item.itemId];
      delete pendingTranscriptPreviousItemRef.current[item.itemId];
      setConversationItems((current) =>
        removeVoiceInterviewTranscriptItem(current, item.itemId),
      );
    };

    const onAudioTranscriptDelta = ({
      delta,
      itemId,
    }: TransportLayerTranscriptDelta) => {
      if (attemptId !== attemptIdRef.current) {
        return;
      }

      // Mark agent as speaking
      setIsAgentSpeaking(true);
      clearTimeoutRef(agentSpeakingTimeoutRef);
      agentSpeakingTimeoutRef.current = window.setTimeout(() => {
        setIsAgentSpeaking(false);
      }, AGENT_SPEAKING_IDLE_MS);

      const nextDelta = `${assistantTranscriptRef.current[itemId] ?? ""}${delta}`;
      assistantTranscriptRef.current[itemId] = nextDelta;

      setConversationItems((current) => {
        const existing = current.find((item) => item.id === itemId);

        if (!existing) {
          return current;
        }

        return current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "streaming",
                text: nextDelta,
              }
            : item,
        );
      });
    };

    const onConnectionChange = (
      status: "connecting" | "connected" | "disconnected",
    ) => {
      if (attemptId !== attemptIdRef.current) {
        return;
      }

      if (status === "connecting") {
        setConnectionLabel("Establishing realtime session");
        return;
      }

      if (status === "connected") {
        clearTimeoutRef(disconnectFailureTimeoutRef);
        setConnectionLabel("Realtime session connected");
        setStatusItems((current) =>
          removeVoiceInterviewTranscriptItem(
            current,
            CONNECTION_INTERRUPTED_STATUS_ID,
          ),
        );
        return;
      }

      if (stageRef.current !== "connecting" && stageRef.current !== "live") {
        return;
      }

      if (localSessionIdRef.current) {
        console.warn("[voice-interview] transport disconnected", {
          attemptId,
          scopeSlug: scope.slug,
          sessionId: localSessionIdRef.current,
          stage: stageRef.current,
        });
        enqueueTelemetryEvent({
          eventKey: `transport-disconnected:${localSessionIdRef.current}:${Date.now()}`,
          eventName: "transport_disconnected",
          eventSource: "client",
          payload: {
            stage: stageRef.current,
          },
          recordedAt: new Date().toISOString(),
        });
      }

      setConnectionLabel("Connection unstable. Waiting briefly to recover");
      setStatusItems((current) =>
        upsertStatusTranscriptItem(
          current,
          buildVoiceInterviewSystemTranscriptItem({
            id: CONNECTION_INTERRUPTED_STATUS_ID,
            label: "Connection",
            meta: getMetaLabel(),
            text: `Realtime transport dropped. Waiting ${(
              REALTIME_DISCONNECT_GRACE_MS / 1000
            ).toFixed(1)} seconds for recovery before ending the interview.`,
            tone: "error",
          }),
        ),
      );

      if (disconnectFailureTimeoutRef.current !== null) {
        return;
      }

      disconnectFailureTimeoutRef.current = window.setTimeout(() => {
        disconnectFailureTimeoutRef.current = null;

        if (
          attemptId !== attemptIdRef.current ||
          (stageRef.current !== "connecting" && stageRef.current !== "live")
        ) {
          return;
        }

        const disconnectError = new VoiceInterviewClientError(
          "realtime_disconnected",
          "The realtime session disconnected unexpectedly and did not recover. Retry the interview.",
        );
        logVoiceInterviewFailure({
          attemptId,
          error: disconnectError,
          label: "transport disconnect timeout",
          normalizedError: disconnectError,
          scopeSlug: scope.slug,
          sessionId: localSessionIdRef.current,
          stage: stageRef.current,
        });
        void failSession(disconnectError, attemptId);
      }, REALTIME_DISCONNECT_GRACE_MS);
    };

    const onTurnStarted = () => {
      if (
        attemptId !== attemptIdRef.current ||
        clientTimingsRef.current.firstAssistantResponse !== undefined ||
        !startupStartedAtRef.current
      ) {
        return;
      }

      clientTimingsRef.current.firstAssistantResponse = roundDurationMs(
        nowMs() - startupStartedAtRef.current,
      );
      logTimings();

      if (localSessionIdRef.current) {
        enqueueTelemetryEvent({
          eventKey: `first-assistant-response:${localSessionIdRef.current}:${attemptId}`,
          eventName: "first_assistant_response",
          eventSource: "client",
          payload: {
            durationMs: clientTimingsRef.current.firstAssistantResponse ?? 0,
          },
          recordedAt: new Date().toISOString(),
        });
      }
    };

    const onTransportEvent = (event: TransportEvent) => {
      if (attemptId !== attemptIdRef.current) {
        return;
      }

      if (
        clientTimingsRef.current.firstAssistantAudio === undefined &&
        startupStartedAtRef.current &&
        (event.type === "output_audio_buffer.started" ||
          event.type === "response.output_audio.delta")
      ) {
        clientTimingsRef.current.firstAssistantAudio = roundDurationMs(
          nowMs() - startupStartedAtRef.current,
        );
        logTimings();

        if (localSessionIdRef.current) {
          enqueueTelemetryEvent({
            eventKey: `first-assistant-audio:${localSessionIdRef.current}:${attemptId}`,
            eventName: "first_assistant_audio",
            eventSource: "client",
            payload: {
              durationMs: clientTimingsRef.current.firstAssistantAudio ?? 0,
            },
            recordedAt: new Date().toISOString(),
          });
        }
      }

      if (event.type === "response.done") {
        const response =
          "response" in event &&
          event.response &&
          typeof event.response === "object"
            ? (event.response as Record<string, unknown>)
            : null;
        const usage =
          response && response.usage && typeof response.usage === "object"
            ? (response.usage as Record<string, unknown>)
            : null;
        const inputTokenDetails =
          usage &&
          usage.input_token_details &&
          typeof usage.input_token_details === "object"
            ? (usage.input_token_details as Record<string, unknown>)
            : {};
        const cachedTokenDetails =
          inputTokenDetails.cached_tokens_details &&
          typeof inputTokenDetails.cached_tokens_details === "object"
            ? (inputTokenDetails.cached_tokens_details as Record<
                string,
                unknown
              >)
            : {};
        const outputTokenDetails =
          usage &&
          usage.output_token_details &&
          typeof usage.output_token_details === "object"
            ? (usage.output_token_details as Record<string, unknown>)
            : {};
        const responseId =
          typeof response?.id === "string"
            ? response.id
            : typeof event.event_id === "string"
              ? event.event_id
              : `response-done-${Date.now()}`;

        if (localSessionIdRef.current) {
          enqueueTelemetryEvent({
            eventKey: `response-done:${localSessionIdRef.current}:${responseId}`,
            eventName: "realtime_response_done",
            eventSource: "client",
            payload: {
              responseId,
            },
            recordedAt: new Date().toISOString(),
          });
        }

        if (usage) {
          enqueueUsageEvent({
            model: realtimeModelRef.current,
            rawUsage: usage,
            recordedAt: new Date().toISOString(),
            runtimeKind: VOICE_INTERVIEW_RUNTIME_KIND,
            serviceTier: serviceTierRef.current,
            usage: {
              input_audio_tokens:
                typeof inputTokenDetails.audio_tokens === "number"
                  ? inputTokenDetails.audio_tokens
                  : 0,
              input_cached_audio_tokens:
                typeof cachedTokenDetails.audio_tokens === "number"
                  ? cachedTokenDetails.audio_tokens
                  : 0,
              input_cached_text_tokens:
                typeof cachedTokenDetails.text_tokens === "number"
                  ? cachedTokenDetails.text_tokens
                  : 0,
              input_text_tokens:
                typeof inputTokenDetails.text_tokens === "number"
                  ? inputTokenDetails.text_tokens
                  : 0,
              input_tokens:
                typeof usage.input_tokens === "number" ? usage.input_tokens : 0,
              output_audio_tokens:
                typeof outputTokenDetails.audio_tokens === "number"
                  ? outputTokenDetails.audio_tokens
                  : 0,
              output_text_tokens:
                typeof outputTokenDetails.text_tokens === "number"
                  ? outputTokenDetails.text_tokens
                  : 0,
              output_tokens:
                typeof usage.output_tokens === "number"
                  ? usage.output_tokens
                  : 0,
              total_tokens:
                typeof usage.total_tokens === "number" ? usage.total_tokens : 0,
            },
            usageKey: `response-done:${responseId}`,
            usageSource: "realtime_response",
          });
        }
      }

      if (event.type === "input_audio_buffer.speech_started") {
        setIsUserSpeaking(true);
        transcriptMetaRef.current[event.item_id] ??= getMetaLabel();
        setMicLabel("Listening to your answer");
        return;
      }

      if (event.type === "input_audio_buffer.committed") {
        setIsUserSpeaking(false);
        pendingTranscriptPreviousItemRef.current[event.item_id] =
          event.previous_item_id;
        transcriptMetaRef.current[event.item_id] ??= getMetaLabel();
        setMicLabel("Transcribing your answer");
        return;
      }

      if (event.type === "input_audio_buffer.speech_stopped") {
        setIsUserSpeaking(false);
        transcriptMetaRef.current[event.item_id] ??= getMetaLabel();
        setMicLabel("Transcribing your answer");
        return;
      }

      if (
        event.type === "conversation.item.input_audio_transcription.completed"
      ) {
        const transcriptItem = buildVoiceInterviewUserTranscriptItem({
          id: event.item_id,
          meta: transcriptMetaRef.current[event.item_id] ?? getMetaLabel(),
          text: event.transcript,
        });

        if (!transcriptItem) {
          setMicLabel(
            isMutedRef.current ? "Live and muted" : "Live and unmuted",
          );
          return;
        }

        transcriptMetaRef.current[event.item_id] = transcriptItem.meta;
        setConversationItems((current) =>
          upsertVoiceInterviewTranscriptItem(
            current,
            transcriptItem,
            pendingTranscriptPreviousItemRef.current[event.item_id],
          ),
        );
        setMicLabel(isMutedRef.current ? "Live and muted" : "Live and unmuted");

        if (event.usage) {
          enqueueUsageEvent({
            model: transcriptionModelRef.current,
            rawUsage: event.usage as Record<string, unknown>,
            recordedAt: new Date().toISOString(),
            runtimeKind: VOICE_INTERVIEW_RUNTIME_KIND,
            serviceTier: serviceTierRef.current,
            usage: {
              input_audio_tokens:
                typeof event.usage.input_token_details?.audio_tokens ===
                "number"
                  ? event.usage.input_token_details.audio_tokens
                  : 0,
              input_text_tokens:
                typeof event.usage.input_token_details?.text_tokens === "number"
                  ? event.usage.input_token_details.text_tokens
                  : 0,
              output_text_tokens:
                typeof event.usage.output_tokens === "number"
                  ? event.usage.output_tokens
                  : 0,
              total_tokens:
                typeof event.usage.total_tokens === "number"
                  ? event.usage.total_tokens
                  : 0,
              type: event.usage.type,
            },
            usageKey: `input-audio-transcription:${event.item_id}`,
            usageSource: "realtime_input_transcription",
          });
        }

        return;
      }

      if (event.type === "conversation.item.input_audio_transcription.failed") {
        setMicLabel(isMutedRef.current ? "Live and muted" : "Live and unmuted");
        setStatusItems((current) =>
          upsertStatusTranscriptItem(
            current,
            buildVoiceInterviewSystemTranscriptItem({
              id: `transcription-failed-${event.item_id}`,
              label: "Transcription",
              meta: transcriptMetaRef.current[event.item_id] ?? getMetaLabel(),
              text:
                event.error?.message ??
                "Your last spoken turn could not be transcribed. Please repeat the answer.",
              tone: "error",
            }),
          ),
        );

        if (localSessionIdRef.current) {
          enqueueTelemetryEvent({
            eventKey: `transcription-failed:${localSessionIdRef.current}:${event.item_id}`,
            eventName: "input_audio_transcription_failed",
            eventSource: "client",
            payload: {
              itemId: event.item_id,
              message:
                typeof event.error?.message === "string"
                  ? event.error.message
                  : "unknown",
            },
            recordedAt: new Date().toISOString(),
          });
        }
      }
    };

    const onError = (error: TransportError) => {
      if (attemptId !== attemptIdRef.current) {
        return;
      }

      const normalizedError = getTransportErrorMessage(error);
      logVoiceInterviewFailure({
        attemptId,
        error,
        label: "transport error event",
        normalizedError,
        scopeSlug: scope.slug,
        sessionId: localSessionIdRef.current,
        stage: stageRef.current,
      });
      void failSession(normalizedError, attemptId);
    };

    transport.on("*", onTransportEvent);
    transport.on("audio_transcript_delta", onAudioTranscriptDelta);
    transport.on("connection_change", onConnectionChange);
    transport.on("error", onError);
    transport.on("item_deleted", onItemDeleted);
    transport.on("item_update", onItemUpdate);
    transport.on("turn_started", onTurnStarted);

    transportCleanupRef.current = () => {
      transport.off("*", onTransportEvent);
      transport.off("audio_transcript_delta", onAudioTranscriptDelta);
      transport.off("connection_change", onConnectionChange);
      transport.off("error", onError);
      transport.off("item_deleted", onItemDeleted);
      transport.off("item_update", onItemUpdate);
      transport.off("turn_started", onTurnStarted);
      transport.close();
    };
  }

  async function startInterview(force = false) {
    if (
      !force &&
      (stageRef.current === "connecting" || stageRef.current === "live")
    ) {
      return;
    }

    const attemptId = attemptIdRef.current + 1;
    attemptIdRef.current = attemptId;
    releaseActiveResources();
    resetRuntimeState();
    setConnectionLabel(
      "Requesting microphone access and starting secure bootstrap",
    );
    setConversationItems([]);
    setElapsedSeconds(0);
    setErrorMessage(undefined);
    setIsMuted(false);
    setMicLabel("Requesting permission");
    setStage("connecting");
    setStatusItems([
      buildVoiceInterviewSystemTranscriptItem({
        id: "setup-status",
        label: "Browser",
        meta: "00:00",
        text: `Requesting microphone access and starting secure session bootstrap for ${scope.title}.`,
      }),
    ]);
    startTimestampRef.current = Date.now();
    startupStartedAtRef.current = nowMs();

    const controller = new AbortController();
    bootstrapAbortRef.current = controller;

    const startupFlow = startVoiceInterviewConnectFlow({
      createBootstrap: () =>
        createInterviewSessionBootstrap(scope, controller.signal),
      getMicrophoneStream: () =>
        navigator.mediaDevices.getUserMedia(MICROPHONE_CONSTRAINTS),
    });
    const bootstrapPromise = startupFlow.bootstrap.promise.then((result) => {
      clientTimingsRef.current.bootstrapApi = result.durationMs;
      serverTimingsRef.current = result.value.timingsMs;
      return result;
    });

    try {
      const { durationMs: micPermissionMs, value: mediaStream } =
        await startupFlow.microphone.promise;

      clientTimingsRef.current.micPermission = micPermissionMs;

      if (attemptId !== attemptIdRef.current) {
        stopMediaStream(mediaStream);
        return;
      }

      await optimizeMicrophoneStreamForSpeech(mediaStream);
      mediaStreamRef.current = mediaStream;
      setConnectionLabel("Waiting for secure interview session bootstrap");
      setMicLabel("Permission granted");
      setStatusItems((current) =>
        upsertStatusTranscriptItem(
          current,
          buildVoiceInterviewSystemTranscriptItem({
            id: "setup-status",
            label: "Browser",
            meta: getMetaLabel(),
            text: `Microphone permission granted. Waiting for secure session bootstrap for ${scope.title}.`,
          }),
        ),
      );

      const { value: bootstrap } = await bootstrapPromise;

      if (bootstrapAbortRef.current === controller) {
        bootstrapAbortRef.current = null;
      }

      if (attemptId !== attemptIdRef.current) {
        stopMediaStream(mediaStream);
        void cancelInterviewSession(
          bootstrap.localSession.id,
          "setup_abort",
        ).catch((stateSyncError) => {
          console.error(
            "Unable to cancel stale interview session bootstrap",
            stateSyncError,
          );
        });
        return;
      }

      localSessionIdRef.current = bootstrap.localSession.id;
      realtimeModelRef.current = bootstrap.realtime.model;
      transcriptionModelRef.current = bootstrap.realtime.transcriptionModel;
      serviceTierRef.current = VOICE_INTERVIEW_DEFAULT_SERVICE_TIER;
      enqueueTelemetryEvent({
        eventKey: `client-bootstrap-ready:${bootstrap.localSession.id}:${attemptId}`,
        eventName: "client_bootstrap_ready",
        eventSource: "client",
        payload: {
          bootstrapApiMs: clientTimingsRef.current.bootstrapApi ?? 0,
          localSessionId: bootstrap.localSession.id,
          micPermissionMs: clientTimingsRef.current.micPermission ?? 0,
          openAiBootstrapMs: bootstrap.timingsMs?.openAiBootstrap ?? 0,
          openAiSessionId: bootstrap.realtime.openAiSessionId,
          profileSyncMs: bootstrap.timingsMs?.profileSync ?? 0,
          webrtcModel: bootstrap.realtime.model,
        },
        recordedAt: new Date().toISOString(),
      });
      setConnectionLabel("Establishing realtime session");
      setStatusItems((current) =>
        upsertStatusTranscriptItem(
          current,
          buildVoiceInterviewSystemTranscriptItem({
            id: "setup-status",
            label: "Session",
            meta: getMetaLabel(),
            text: "Secure bootstrap completed. Establishing the realtime browser session.",
          }),
        ),
      );

      const transport = new OpenAIRealtimeWebRTC({
        audioElement: audioElementRef.current ?? undefined,
        mediaStream,
      });

      registerTransport(transport, attemptId);
      transportRef.current = transport;

      const connectStartedAt = nowMs();
      await transport.connect({
        apiKey: bootstrap.clientSecret.value,
        // The server bootstrap already sets tracing on the realtime session.
        // Passing an explicit tracing field prevents the WebRTC SDK from
        // sending a follow-up tracing update that the API rejects.
        initialSessionConfig: {
          tracing: null,
        },
        model: bootstrap.realtime.model,
      });
      clientTimingsRef.current.webrtcConnect = roundDurationMs(
        nowMs() - connectStartedAt,
      );

      if (attemptId !== attemptIdRef.current) {
        releaseMediaAndTransportResources();
        void cancelInterviewSession(
          bootstrap.localSession.id,
          "setup_abort",
        ).catch((stateSyncError) => {
          console.error(
            "Unable to cancel stale interview session",
            stateSyncError,
          );
        });
        return;
      }

      clientTimingsRef.current.timeToLive = roundDurationMs(
        nowMs() - (startupStartedAtRef.current ?? connectStartedAt),
      );

      setStage("live");
      setConnectionLabel("Realtime session connected");
      setMicLabel("Live and unmuted");
      setStatusItems((current) => {
        const withLiveStatus = upsertStatusTranscriptItem(
          current,
          buildVoiceInterviewSystemTranscriptItem({
            id: "setup-status",
            label: "Session",
            meta: getMetaLabel(),
            text: "Realtime voice session connected. The interviewer will open with the first topic-scoped question.",
          }),
        );

        return upsertStatusTranscriptItem(
          withLiveStatus,
          buildVoiceInterviewSystemTranscriptItem({
            citations: buildVoiceInterviewScopedCitations(scope),
            id: "scope-lock",
            label: "Scope lock",
            meta: getMetaLabel(),
            text: `This interview stays inside ${scope.title}. Recent-changes browsing remains disabled until server-owned search is wired in.`,
            tone: "search",
          }),
        );
      });
      logTimings();
      enqueueTelemetryEvent({
        eventKey: `transport-connected:${bootstrap.localSession.id}:${attemptId}`,
        eventName: "transport_connected",
        eventSource: "client",
        payload: {
          timeToLiveMs: clientTimingsRef.current.timeToLive ?? 0,
          webrtcConnectMs: clientTimingsRef.current.webrtcConnect ?? 0,
        },
        recordedAt: new Date().toISOString(),
      });

      activateVoiceInterviewSession({
        markSessionActive: () =>
          patchSessionState(bootstrap.localSession.id, {
            state: "active",
          }),
        onStateSyncError: (stateSyncError) => {
          console.error(
            "Unable to persist active interview session state",
            stateSyncError,
          );
        },
        sendInitialResponse: () => {
          transport.sendEvent({
            type: "response.create",
          });
        },
      });
    } catch (error) {
      if (attemptId !== attemptIdRef.current || isAbortError(error)) {
        return;
      }

      const normalizedError = normalizeClientError(error);
      logVoiceInterviewFailure({
        attemptId,
        error,
        label: "startup/connect failure",
        normalizedError,
        scopeSlug: scope.slug,
        sessionId: localSessionIdRef.current,
        stage: stageRef.current,
      });

      if (!localSessionIdRef.current) {
        void bootstrapPromise
          .then(async ({ value: bootstrap }) => {
            if (bootstrapAbortRef.current === controller) {
              bootstrapAbortRef.current = null;
            }

            try {
              await patchSessionState(bootstrap.localSession.id, {
                errorCode: normalizedError.code,
                errorMessage: normalizedError.message,
                state: "failed",
              });
            } catch (stateSyncError) {
              console.error(
                "Unable to persist background failed interview session state",
                stateSyncError,
              );
            }
          })
          .catch(() => {});

        await failSession(normalizedError, attemptId, {
          preserveBootstrap: true,
        });
        return;
      }

      await failSession(normalizedError, attemptId);
    }
  }

  function start() {
    void startInterview();
  }

  function cancelSetup() {
    if (stageRef.current !== "connecting") {
      return;
    }

    const sessionId = localSessionIdRef.current;
    attemptIdRef.current += 1;
    releaseActiveResources();
    resetRuntimeState();

    if (!sessionId) {
      return;
    }

    void cancelInterviewSession(sessionId, "setup_abort").catch((error) => {
      console.error(
        "Unable to persist cancelled interview session state",
        error,
      );
    });
  }

  function toggleMute() {
    if (stageRef.current !== "live" || !transportRef.current) {
      return;
    }

    const nextMuted = !isMuted;
    transportRef.current.mute(nextMuted);
    setIsMuted(nextMuted);
    setMicLabel(nextMuted ? "Live and muted" : "Live and unmuted");
  }

  function end() {
    if (stageRef.current !== "live") {
      return;
    }

    const sessionId = localSessionIdRef.current;
    attemptIdRef.current += 1;
    releaseActiveResources();
    setIsAgentSpeaking(false);
    setConnectionLabel("Session closed cleanly");
    setIsMuted(false);
    setIsUserSpeaking(false);
    setMicLabel("Released");
    setStage("completed");
    setStatusItems((current) =>
      upsertStatusTranscriptItem(
        current,
        buildVoiceInterviewSystemTranscriptItem({
          id: "session-complete",
          label: "Session closed",
          meta: getMetaLabel(),
          text: "The live interview ended cleanly. Review the transcript or start another round.",
        }),
      ),
    );
    logTimings();

    if (!sessionId) {
      return;
    }

    void completeInterviewSession(sessionId).catch((error) => {
      console.error(
        "Unable to persist completed interview session state",
        error,
      );
    });
  }

  async function recoverBlockingSession() {
    if (!blockingSession || isRecoveringBlockingSession) {
      return;
    }

    setConnectionLabel("Ending the previous live session");
    setIsRecoveringBlockingSession(true);

    try {
      await forceEndBlockingSession(blockingSession.id);
      setBlockingSession(undefined);
      await startInterview(true);
    } catch (error) {
      const normalizedError = normalizeClientError(error);
      setConnectionLabel("Unable to end the previous live session");
      setErrorMessage(normalizedError.message);
      setIsRecoveringBlockingSession(false);
    }
  }

  function retry() {
    if (blockingSession) {
      void recoverBlockingSession();
      return;
    }

    reset();
    void startInterview(true);
  }

  function reset() {
    const sessionId = localSessionIdRef.current;
    const shouldCancel =
      stageRef.current === "connecting" || stageRef.current === "live";

    attemptIdRef.current += 1;
    releaseActiveResources();
    resetRuntimeState();

    if (!shouldCancel || !sessionId) {
      return;
    }

    void cancelInterviewSession(sessionId, "retry").catch((error) => {
      console.error("Unable to persist reset interview session state", error);
    });
  }

  const session = buildVoiceInterviewRuntimeSnapshot({
    completionSummary,
    connectionLabel,
    elapsedSeconds,
    errorMessage,
    isMuted,
    micLabel,
    scope,
    stage,
    transcript: [...statusItems, ...conversationItems],
  });

  return {
    audioElementRef,
    canRecoverBlockingSession: Boolean(blockingSession),
    cancelSetup,
    end,
    isRecoveringBlockingSession,
    isMuted,
    isUserSpeaking,
    isAgentSpeaking,
    recoverBlockingSession: () => {
      void recoverBlockingSession();
    },
    reset,
    retry,
    session,
    stage,
    start,
    toggleMute,
  };
}
