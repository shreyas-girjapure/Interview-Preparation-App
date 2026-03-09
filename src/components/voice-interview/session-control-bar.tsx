import Link from "next/link";
import {
  LoaderCircle,
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { VoiceInterviewStage } from "@/lib/interview/voice-interview-session";

type SessionControlBarProps = {
  backHref: string;
  isMuted: boolean;
  stage: VoiceInterviewStage;
  onCancelSetup: () => void;
  onEnd: () => void;
  onReset: () => void;
  onRetry: () => void;
  onStart: () => void;
  onToggleMute: () => void;
};

export function SessionControlBar({
  backHref,
  isMuted,
  stage,
  onCancelSetup,
  onEnd,
  onReset,
  onRetry,
  onStart,
  onToggleMute,
}: SessionControlBarProps) {
  const note =
    stage === "ready"
      ? "Microphone access is requested only after the user explicitly starts."
      : stage === "connecting"
        ? "Setup stays visible and cancellable while the browser session is prepared."
        : stage === "live"
          ? "Controls stay compact so the stage and transcript remain readable during speech."
          : stage === "completed"
            ? "Completion keeps the same shell so persistence and debrief can attach later."
            : "Failure keeps a clear retry path without dropping the topic context.";

  return (
    <section className="rounded-[1.9rem] border border-border/70 bg-background/92 p-5 shadow-sm backdrop-blur">
      <div>
        <p className="text-sm text-muted-foreground">Session controls</p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight">
          Control tray
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {stage === "ready" ? (
          <>
            <Button
              type="button"
              size="lg"
              className="rounded-full"
              onClick={onStart}
            >
              <Mic className="size-4" />
              Start interview
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full"
              disabled
            >
              <MicOff className="size-4" />
              Mute unavailable
            </Button>
            <Button
              asChild
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full"
            >
              <Link href={backHref}>
                <PhoneOff className="size-4" />
                Leave route
              </Link>
            </Button>
          </>
        ) : null}

        {stage === "connecting" ? (
          <>
            <Button type="button" size="lg" className="rounded-full" disabled>
              <LoaderCircle className="size-4 animate-spin" />
              Connecting...
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full"
              disabled
            >
              <MicOff className="size-4" />
              Mute unavailable
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full"
              onClick={onCancelSetup}
            >
              <PhoneOff className="size-4" />
              Cancel setup
            </Button>
          </>
        ) : null}

        {stage === "live" ? (
          <>
            <Button
              type="button"
              size="lg"
              className="rounded-full"
              onClick={onToggleMute}
            >
              {isMuted ? (
                <Mic className="size-4" />
              ) : (
                <MicOff className="size-4" />
              )}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full border-destructive/25 text-destructive hover:text-destructive"
              onClick={onEnd}
            >
              <PhoneOff className="size-4" />
              End interview
            </Button>
            <Button
              asChild
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full"
            >
              <Link href={backHref}>
                <Sparkles className="size-4" />
                Back to topic
              </Link>
            </Button>
          </>
        ) : null}

        {stage === "completed" ? (
          <>
            <Button
              type="button"
              size="lg"
              className="rounded-full"
              onClick={onStart}
            >
              <RotateCcw className="size-4" />
              Start again
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full"
              onClick={onReset}
            >
              <Sparkles className="size-4" />
              Review ready state
            </Button>
            <Button
              asChild
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full"
            >
              <Link href={backHref}>
                <PhoneOff className="size-4" />
                Leave route
              </Link>
            </Button>
          </>
        ) : null}

        {stage === "failed" ? (
          <>
            <Button
              type="button"
              size="lg"
              className="rounded-full"
              onClick={onRetry}
            >
              <RotateCcw className="size-4" />
              Retry session
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full"
              onClick={onReset}
            >
              <Sparkles className="size-4" />
              Review ready state
            </Button>
            <Button
              asChild
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full"
            >
              <Link href={backHref}>
                <PhoneOff className="size-4" />
                Leave route
              </Link>
            </Button>
          </>
        ) : null}
      </div>
    </section>
  );
}
