"use client";

import { LiveTranscriptPanel } from "@/components/voice-interview/live-transcript-panel";
import { VoiceInterviewShell } from "@/components/voice-interview/voice-interview-shell";
import { VoiceStage } from "@/components/voice-interview/voice-stage";
import { useVoiceInterviewAgent } from "@/hooks/use-voice-interview-agent";
import { useVoiceInterviewDemo } from "@/hooks/use-voice-interview-demo";
import type { VoiceInterviewStage } from "@/lib/interview/voice-interview-session";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

type TopicVoiceInterviewExperienceProps = {
  initialStage?: VoiceInterviewStage;
  scope: VoiceInterviewScope;
};

export function TopicVoiceInterviewExperience({
  initialStage,
  scope,
}: TopicVoiceInterviewExperienceProps) {
  const previewMode = Boolean(initialStage);
  const previewSession = useVoiceInterviewDemo({
    scope,
    initialStage,
    previewMode,
  });
  const liveSession = useVoiceInterviewAgent({
    scope,
  });
  const {
    audioElementRef,
    canRecoverBlockingSession,
    isMuted,
    isRecoveringBlockingSession,
    isUserSpeaking,
    isAgentSpeaking,
    recoverBlockingSession,
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
        canRecoverBlockingSession: false,
        isRecoveringBlockingSession: false,
        recoverBlockingSession: () => {},
      }
    : liveSession;

  const backHref = `/topics/${scope.slug}`;
  const previewLocked = previewMode ? previewSession.previewLocked : false;
  const previewLabel =
    previewLocked && initialStage
      ? `Previewing ${session.stageLabel}`
      : undefined;

  return (
    <>
      <VoiceInterviewShell
        backHref={backHref}
        description={scope.summary}
        runtimeLabel={
          previewMode ? "Preview adapter" : "Realtime browser session"
        }
        scopeLabel={scope.scopeLabel}
        scopeTitle={scope.title}
        previewLabel={previewLabel}
        stage={
          <VoiceStage
            canRecoverBlockingSession={canRecoverBlockingSession}
            isRecoveringBlockingSession={isRecoveringBlockingSession}
            isMuted={isMuted}
            isUserSpeaking={isUserSpeaking}
            isAgentSpeaking={isAgentSpeaking}
            onCancelSetup={cancelSetup}
            onEnd={end}
            onRecoverBlockingSession={recoverBlockingSession}
            onRetry={retry}
            onStart={start}
            onToggleMute={toggleMute}
            session={session}
            stage={stage}
          />
        }
        transcript={<LiveTranscriptPanel session={session} />}
      />
      {!previewMode ? (
        <audio ref={audioElementRef} autoPlay playsInline className="hidden" />
      ) : null}
    </>
  );
}
