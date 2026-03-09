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
  CreateVoiceInterviewSessionResponse,
  UpdateVoiceInterviewSessionRequest,
} from "@/lib/interview/voice-interview-api";
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
import type {
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
  isMuted: boolean;
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
  error?: string;
  errorCode?: string;
};

class VoiceInterviewClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "VoiceInterviewClientError";
  }
}

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

type ExperimentalAudioTrackConstraints = MediaTrackConstraints & {
  voiceIsolation?: ConstrainBoolean;
};

type ExperimentalSupportedAudioConstraints = MediaTrackSupportedConstraints & {
  voiceIsolation?: boolean;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function stopMediaStream(mediaStream: MediaStream | null) {
  mediaStream?.getTracks().forEach((track) => track.stop());
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

    throw new VoiceInterviewClientError(
      errorResponse?.errorCode ?? "bootstrap_failed",
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
  const clientTimingsRef = useRef<VoiceInterviewClientTimingsMs>({});
  const isMutedRef = useRef(false);
  const lastPatchedStateRef = useRef<
    UpdateVoiceInterviewSessionRequest["state"] | null
  >(null);
  const localSessionIdRef = useRef<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pendingTranscriptPreviousItemRef = useRef<
    Record<string, string | null | undefined>
  >({});
  const serverTimingsRef = useRef<
    CreateVoiceInterviewSessionResponse["timingsMs"] | undefined
  >(undefined);
  const stageRef = useRef<VoiceInterviewStage>("ready");
  const startTimestampRef = useRef<number | null>(null);
  const startupStartedAtRef = useRef<number | null>(null);
  const transcriptMetaRef = useRef<Record<string, string>>({});
  const transportCleanupRef = useRef<(() => void) | null>(null);
  const transportRef = useRef<OpenAIRealtimeWebRTC | null>(null);
  const attemptIdRef = useRef(0);

  const [connectionLabel, setConnectionLabel] = useState<string | undefined>();
  const [conversationItems, setConversationItems] = useState<
    VoiceInterviewTranscriptItem[]
  >([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isMuted, setIsMuted] = useState(false);
  const [micLabel, setMicLabel] = useState<string | undefined>();
  const [stage, setStage] = useState<VoiceInterviewStage>("ready");
  const [statusItems, setStatusItems] = useState<
    VoiceInterviewTranscriptItem[]
  >([]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

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

  function resetRuntimeState() {
    assistantTranscriptRef.current = {};
    bootstrapAbortRef.current = null;
    clientTimingsRef.current = {};
    lastPatchedStateRef.current = null;
    localSessionIdRef.current = null;
    serverTimingsRef.current = undefined;
    pendingTranscriptPreviousItemRef.current = {};
    setConnectionLabel(undefined);
    setConversationItems([]);
    setElapsedSeconds(0);
    setErrorMessage(undefined);
    setIsMuted(false);
    setMicLabel(undefined);
    setStage("ready");
    setStatusItems([]);
    startTimestampRef.current = null;
    startupStartedAtRef.current = null;
    transcriptMetaRef.current = {};
  }

  function releaseMediaAndTransportResources() {
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

  useEffect(() => {
    return () => {
      const sessionId = localSessionIdRef.current;
      const shouldCancel =
        stageRef.current === "connecting" || stageRef.current === "live";

      attemptIdRef.current += 1;
      bootstrapAbortRef.current?.abort();
      bootstrapAbortRef.current = null;
      releaseMediaAndTransportResources();

      if (!shouldCancel || !sessionId) {
        return;
      }

      void fetch(`/api/interview/sessions/${sessionId}`, {
        body: JSON.stringify({
          state: "cancelled",
        } satisfies UpdateVoiceInterviewSessionRequest),
        headers: {
          "Content-Type": "application/json",
        },
        keepalive: true,
        method: "PATCH",
      });
    };
  }, []);

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

    setConnectionLabel("Interview session failed");
    setErrorMessage(error.message);
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
        setConnectionLabel("Realtime session connected");
        return;
      }

      if (stageRef.current === "connecting" || stageRef.current === "live") {
        void failSession(
          new VoiceInterviewClientError(
            "realtime_disconnected",
            "The realtime session disconnected unexpectedly. Retry the interview.",
          ),
          attemptId,
        );
      }
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
      }

      if (event.type === "input_audio_buffer.speech_started") {
        transcriptMetaRef.current[event.item_id] ??= getMetaLabel();
        setMicLabel("Listening to your answer");
        return;
      }

      if (event.type === "input_audio_buffer.committed") {
        pendingTranscriptPreviousItemRef.current[event.item_id] =
          event.previous_item_id;
        transcriptMetaRef.current[event.item_id] ??= getMetaLabel();
        setMicLabel("Transcribing your answer");
        return;
      }

      if (event.type === "input_audio_buffer.speech_stopped") {
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
      }
    };

    const onError = (error: TransportError) => {
      if (attemptId !== attemptIdRef.current) {
        return;
      }

      void failSession(getTransportErrorMessage(error), attemptId);
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
        void patchSessionState(bootstrap.localSession.id, {
          state: "cancelled",
        }).catch((stateSyncError) => {
          console.error(
            "Unable to cancel stale interview session bootstrap",
            stateSyncError,
          );
        });
        return;
      }

      localSessionIdRef.current = bootstrap.localSession.id;
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
        model: bootstrap.realtime.model,
      });
      clientTimingsRef.current.webrtcConnect = roundDurationMs(
        nowMs() - connectStartedAt,
      );

      if (attemptId !== attemptIdRef.current) {
        releaseMediaAndTransportResources();
        void patchSessionState(bootstrap.localSession.id, {
          state: "cancelled",
        }).catch((stateSyncError) => {
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

    void patchSessionState(sessionId, {
      state: "cancelled",
    }).catch((error) => {
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
    setConnectionLabel("Session closed cleanly");
    setIsMuted(false);
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

    void patchSessionState(sessionId, {
      state: "completed",
    }).catch((error) => {
      console.error(
        "Unable to persist completed interview session state",
        error,
      );
    });
  }

  function retry() {
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

    void patchSessionState(sessionId, {
      state: "cancelled",
    }).catch((error) => {
      console.error("Unable to persist reset interview session state", error);
    });
  }

  const session = buildVoiceInterviewRuntimeSnapshot({
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
    cancelSetup,
    end,
    isMuted,
    reset,
    retry,
    session,
    stage,
    start,
    toggleMute,
  };
}
