import type {
  CreateVoiceInterviewSessionResponse,
  VoiceInterviewBootstrapTimingsMs,
} from "@/lib/interview/voice-interview-api";

export type MeasuredAsyncResult<T> = {
  durationMs: number;
  value: T;
};

export type VoiceInterviewClientTimingsMs = {
  bootstrapApi?: number;
  firstAssistantAudio?: number;
  firstAssistantResponse?: number;
  micPermission?: number;
  timeToLive?: number;
  webrtcConnect?: number;
};

export function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function roundDurationMs(durationMs: number) {
  return Math.max(0, Math.round(durationMs));
}

export function startMeasuredAsync<T>(
  operation: () => Promise<T>,
  getNowMs: () => number = nowMs,
) {
  const startedAt = getNowMs();

  return {
    startedAt,
    promise: operation().then((value) => ({
      durationMs: roundDurationMs(getNowMs() - startedAt),
      value,
    })),
  };
}

export function startVoiceInterviewConnectFlow({
  createBootstrap,
  getMicrophoneStream,
  getNowMs = nowMs,
}: {
  createBootstrap: () => Promise<CreateVoiceInterviewSessionResponse>;
  getMicrophoneStream: () => Promise<MediaStream>;
  getNowMs?: () => number;
}) {
  return {
    bootstrap: startMeasuredAsync(createBootstrap, getNowMs),
    microphone: startMeasuredAsync(getMicrophoneStream, getNowMs),
  };
}

export function activateVoiceInterviewSession({
  markSessionActive,
  onStateSyncError,
}: {
  markSessionActive: () => Promise<void>;
  onStateSyncError: (error: unknown) => void;
}) {
  void markSessionActive().catch(onStateSyncError);
}

export function logVoiceInterviewTimings({
  clientTimingsMs,
  scopeSlug,
  serverTimingsMs,
}: {
  clientTimingsMs: VoiceInterviewClientTimingsMs;
  scopeSlug: string;
  serverTimingsMs?: VoiceInterviewBootstrapTimingsMs;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[voice-interview] timings", {
    clientTimingsMs,
    scopeSlug,
    serverTimingsMs,
  });
}
