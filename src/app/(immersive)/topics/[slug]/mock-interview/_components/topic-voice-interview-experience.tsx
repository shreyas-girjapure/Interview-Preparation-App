"use client";

import { useState } from "react";

import { LiveTranscriptPanel } from "@/components/voice-interview/live-transcript-panel";
import { VoiceInterviewShell } from "@/components/voice-interview/voice-interview-shell";
import { VoiceStage } from "@/components/voice-interview/voice-stage";
import { Button } from "@/components/ui/button";
import { useVoiceInterviewAgent } from "@/hooks/use-voice-interview-agent";
import { useVoiceInterviewDemo } from "@/hooks/use-voice-interview-demo";
import type { VoiceInterviewRuntimePreference } from "@/lib/interview/voice-interview-api";
import type { VoiceInterviewStage } from "@/lib/interview/voice-interview-session";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

type TopicVoiceInterviewExperienceProps = {
  defaultRuntimePreference: VoiceInterviewRuntimePreference;
  initialStage?: VoiceInterviewStage;
  scope: VoiceInterviewScope;
};

function normalizeInitialRuntimePreference(
  value: VoiceInterviewRuntimePreference,
): "chained_voice" | "realtime_sts" {
  return value === "chained_voice" ? "chained_voice" : "realtime_sts";
}

function getRuntimeLabel(
  runtimePreference: "chained_voice" | "realtime_sts",
  runtimeKind?: "chained_voice" | "realtime_sts" | null,
  selectionSource?: "auto_policy" | "fallback" | "user_preference" | null,
) {
  const activeRuntime = runtimeKind ?? runtimePreference;
  const baseLabel =
    activeRuntime === "chained_voice" ? "Chained voice" : "Realtime voice";

  return selectionSource === "fallback" ? `${baseLabel} fallback` : baseLabel;
}

export function TopicVoiceInterviewExperience({
  defaultRuntimePreference,
  initialStage,
  scope,
}: TopicVoiceInterviewExperienceProps) {
  const [runtimePreference, setRuntimePreference] = useState<
    "chained_voice" | "realtime_sts"
  >(normalizeInitialRuntimePreference(defaultRuntimePreference));
  const previewMode = Boolean(initialStage);
  const previewSession = useVoiceInterviewDemo({
    scope,
    initialStage,
    previewMode,
  });
  const liveSession = useVoiceInterviewAgent({
    runtimePreference,
    scope,
  });
  const {
    audioElementRef,
    canCommitTurn,
    canRecoverBlockingSession,
    commitTurn,
    isMuted,
    isProcessingTurn,
    isRecoveringBlockingSession,
    isUserSpeaking,
    isAgentSpeaking,
    recoverBlockingSession,
    runtime,
    session,
    stage,
    cancelSetup,
    end,
    retry,
    start,
    toggleMute,
  } = previewMode
    ? {
        ...previewSession,
        audioElementRef: null,
        canCommitTurn: false,
        canRecoverBlockingSession: false,
        commitTurn: () => {},
        isProcessingTurn: false,
        isRecoveringBlockingSession: false,
        recoverBlockingSession: () => {},
        runtime: null,
      }
    : liveSession;

  const backHref = `/topics/${scope.slug}`;
  const previewLocked = previewMode ? previewSession.previewLocked : false;
  const previewLabel =
    previewLocked && initialStage
      ? `Previewing ${session.stageLabel}`
      : undefined;
  const runtimeLabel = previewMode
    ? "Preview adapter"
    : getRuntimeLabel(
        runtimePreference,
        runtime?.kind ?? null,
        runtime?.selectionSource ?? null,
      );

  return (
    <>
      <VoiceInterviewShell
        backHref={backHref}
        description={scope.summary}
        runtimeLabel={runtimeLabel}
        scopeLabel={scope.scopeLabel}
        scopeTitle={scope.title}
        previewLabel={previewLabel}
        stage={
          <div className="space-y-4">
            {!previewMode ? (
              <div className="rounded-[1.5rem] border border-border/70 bg-background/85 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Runtime
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={
                      runtimePreference === "realtime_sts"
                        ? "default"
                        : "outline"
                    }
                    disabled={stage !== "ready"}
                    onClick={() => setRuntimePreference("realtime_sts")}
                  >
                    Realtime voice
                  </Button>
                  <Button
                    type="button"
                    variant={
                      runtimePreference === "chained_voice"
                        ? "default"
                        : "outline"
                    }
                    disabled={stage !== "ready"}
                    onClick={() => setRuntimePreference("chained_voice")}
                  >
                    Chained voice
                  </Button>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Realtime stays duplex over WebRTC. Chained voice commits one
                  answer at a time through server STT, text generation, and TTS.
                </p>
              </div>
            ) : null}
            <VoiceStage
              canCommitTurn={canCommitTurn}
              canRecoverBlockingSession={canRecoverBlockingSession}
              isProcessingTurn={isProcessingTurn}
              isRecoveringBlockingSession={isRecoveringBlockingSession}
              isMuted={isMuted}
              isUserSpeaking={isUserSpeaking}
              isAgentSpeaking={isAgentSpeaking}
              onCancelSetup={cancelSetup}
              onCommitTurn={commitTurn}
              onEnd={end}
              onRecoverBlockingSession={recoverBlockingSession}
              onRetry={retry}
              onStart={start}
              onToggleMute={toggleMute}
              runtimeKind={runtime?.kind ?? runtimePreference}
              session={session}
              stage={stage}
            />
          </div>
        }
        transcript={<LiveTranscriptPanel session={session} />}
      />
      {!previewMode ? (
        <audio ref={audioElementRef} autoPlay playsInline className="hidden" />
      ) : null}
    </>
  );
}
