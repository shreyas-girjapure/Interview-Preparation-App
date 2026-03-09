"use client";

import { useEffect, useState } from "react";

import {
  buildVoiceInterviewSessionSnapshot,
  DEFAULT_STAGE_ELAPSED_SECONDS,
  type VoiceInterviewSessionSnapshot,
  type VoiceInterviewStage,
} from "@/lib/interview/voice-interview-session";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

type UseVoiceInterviewDemoOptions = {
  scope: VoiceInterviewScope;
  initialStage?: VoiceInterviewStage;
  previewMode?: boolean;
};

type VoiceInterviewDemoSession = {
  isMuted: boolean;
  previewLocked: boolean;
  session: VoiceInterviewSessionSnapshot;
  stage: VoiceInterviewStage;
  start: () => void;
  cancelSetup: () => void;
  toggleMute: () => void;
  end: () => void;
  retry: () => void;
  reset: () => void;
};

export function useVoiceInterviewDemo({
  scope,
  initialStage = "ready",
  previewMode = false,
}: UseVoiceInterviewDemoOptions): VoiceInterviewDemoSession {
  const [stage, setStage] = useState<VoiceInterviewStage>(initialStage);
  const [isMuted, setIsMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(
    DEFAULT_STAGE_ELAPSED_SECONDS[initialStage],
  );
  const [previewLocked, setPreviewLocked] = useState(
    previewMode && initialStage !== "ready",
  );

  useEffect(() => {
    if (previewLocked || (stage !== "connecting" && stage !== "live")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [previewLocked, stage]);

  useEffect(() => {
    if (previewLocked || stage !== "connecting") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStage("live");
      setElapsedSeconds((current) =>
        current > 0 ? current : DEFAULT_STAGE_ELAPSED_SECONDS.live,
      );
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [previewLocked, stage]);

  const session = buildVoiceInterviewSessionSnapshot({
    scope,
    stage,
    elapsedSeconds,
    isMuted,
  });

  function unlockPreview() {
    if (previewLocked) {
      setPreviewLocked(false);
    }
  }

  function start() {
    unlockPreview();
    setIsMuted(false);
    setElapsedSeconds(0);
    setStage("connecting");
  }

  function cancelSetup() {
    unlockPreview();
    setIsMuted(false);
    setElapsedSeconds(DEFAULT_STAGE_ELAPSED_SECONDS.ready);
    setStage("ready");
  }

  function toggleMute() {
    unlockPreview();
    setIsMuted((current) => !current);
  }

  function end() {
    unlockPreview();
    setStage("completed");
  }

  function retry() {
    unlockPreview();
    setIsMuted(false);
    setElapsedSeconds(0);
    setStage("connecting");
  }

  function reset() {
    unlockPreview();
    setIsMuted(false);
    setElapsedSeconds(DEFAULT_STAGE_ELAPSED_SECONDS.ready);
    setStage("ready");
  }

  return {
    isMuted,
    previewLocked,
    session,
    stage,
    start,
    cancelSetup,
    toggleMute,
    end,
    retry,
    reset,
  };
}
