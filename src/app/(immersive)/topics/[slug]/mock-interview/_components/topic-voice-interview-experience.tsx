"use client";

import { InterviewBriefingCard } from "@/components/voice-interview/interview-briefing-card";
import { LiveTranscriptPanel } from "@/components/voice-interview/live-transcript-panel";
import { SessionControlBar } from "@/components/voice-interview/session-control-bar";
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
    isMuted,
    session,
    stage,
    cancelSetup,
    end,
    reset,
    retry,
    start,
    toggleMute,
  } = previewMode ? { ...previewSession, audioElementRef: null } : liveSession;

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
        description={
          previewMode
            ? "Preview mode keeps the immersive shell and static stage states available without requesting microphone access."
            : "This route starts a secure browser voice interview scoped to a single topic while keeping the transcript and controls visible at all times."
        }
        runtimeLabel={
          previewMode ? "Preview adapter" : "Realtime browser session"
        }
        scopeLabel={scope.scopeLabel}
        scopeTitle={scope.title}
        stageLabel={session.stageLabel}
        previewLabel={previewLabel}
        briefing={<InterviewBriefingCard scope={scope} />}
        stage={<VoiceStage scopeLabel={scope.scopeLabel} session={session} />}
        transcript={
          <div className="space-y-4">
            <SessionControlBar
              backHref={backHref}
              isMuted={isMuted}
              stage={stage}
              onCancelSetup={cancelSetup}
              onEnd={end}
              onReset={reset}
              onRetry={retry}
              onStart={start}
              onToggleMute={toggleMute}
            />
            <LiveTranscriptPanel
              completionSummary={session.completionSummary}
              errorMessage={session.errorMessage}
              transcript={session.transcript}
            />
          </div>
        }
      />
      {!previewMode ? (
        <audio ref={audioElementRef} autoPlay playsInline className="hidden" />
      ) : null}
    </>
  );
}
