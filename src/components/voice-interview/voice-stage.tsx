import { useState, useEffect } from "react";
import {
  AudioLines,
  Clock3,
  LoaderCircle,
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  User,
  Bot,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  VoiceInterviewSessionSnapshot,
  VoiceInterviewStage,
} from "@/lib/interview/voice-interview-session";

type VoiceStageProps = {
  canRecoverBlockingSession?: boolean;
  isRecoveringBlockingSession?: boolean;
  isMuted?: boolean;
  isUserSpeaking?: boolean;
  isAgentSpeaking?: boolean;
  onCancelSetup: () => void;
  onEnd: () => void;
  onRecoverBlockingSession?: () => void;
  onRetry: () => void;
  onStart: () => void;
  onToggleMute: () => void;
  session: VoiceInterviewSessionSnapshot;
  stage: VoiceInterviewStage;
};

type VisualState =
  | "ready"
  | "connecting"
  | "completed"
  | "failed"
  | "listening"
  | "user-speaking"
  | "agent-speaking"
  | "agent-speaking-muted"
  | "muted";

const visualToneMap: Record<
  VisualState,
  {
    bg: string;
    innerBg: string;
    rings: [string, string, string];
    button: string;
    primaryText: string;
    secondaryText: string;
    endButtonHover: string;
    endButtonIcon: string;
    iconBg: string;
  }
> = {
  // --- NON-LIVE STAGES ---
  ready: {
    bg: "bg-sky-50 shadow-sky-900/5 border-sky-100",
    innerBg: "bg-sky-100/40",
    rings: ["bg-sky-200/40", "bg-sky-300/40", "bg-sky-400/30"],
    button:
      "bg-gradient-to-br from-sky-400 to-sky-600 shadow-sky-500/30 text-white",
    primaryText: "text-sky-900",
    secondaryText: "text-sky-600",
    endButtonHover: "hover:bg-rose-100 text-rose-600",
    endButtonIcon: "text-rose-500",
    iconBg: "bg-sky-100 text-sky-700",
  },
  connecting: {
    bg: "bg-amber-50 shadow-amber-900/5 border-amber-100",
    innerBg: "bg-amber-100/40",
    rings: ["bg-amber-300/40", "bg-amber-400/40", "bg-amber-500/30"],
    button:
      "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30 text-white",
    primaryText: "text-amber-950",
    secondaryText: "text-amber-700",
    endButtonHover: "hover:bg-rose-100 text-rose-600",
    endButtonIcon: "text-rose-500",
    iconBg: "bg-amber-200 text-amber-800",
  },
  completed: {
    bg: "bg-lime-50 shadow-lime-900/5 border-lime-100",
    innerBg: "bg-lime-100/40",
    rings: ["bg-lime-200/40", "bg-lime-300/40", "bg-lime-400/30"],
    button:
      "bg-gradient-to-br from-lime-400 to-lime-600 shadow-lime-500/30 text-white",
    primaryText: "text-lime-950",
    secondaryText: "text-lime-700",
    endButtonHover: "hover:bg-rose-100 text-rose-600",
    endButtonIcon: "text-rose-500",
    iconBg: "bg-lime-200 text-lime-800",
  },
  failed: {
    bg: "bg-rose-50 shadow-rose-900/5 border-rose-100",
    innerBg: "bg-rose-100/40",
    rings: ["bg-rose-200/40", "bg-rose-300/40", "bg-rose-400/30"],
    button:
      "bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30 text-white",
    primaryText: "text-rose-950",
    secondaryText: "text-rose-700",
    endButtonHover: "hover:bg-rose-200 text-rose-700",
    endButtonIcon: "text-rose-600",
    iconBg: "bg-rose-200 text-rose-800",
  },

  // --- LIVE VAD STAGES ---
  listening: {
    bg: "bg-emerald-50 shadow-emerald-900/5 border-emerald-100",
    innerBg: "bg-emerald-100/40",
    rings: ["bg-emerald-200/30", "bg-emerald-300/30", "bg-emerald-400/30"],
    button:
      "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30 text-white",
    primaryText: "text-emerald-900",
    secondaryText: "text-emerald-600",
    endButtonHover: "hover:bg-rose-100 text-rose-600",
    endButtonIcon: "text-rose-500",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  "user-speaking": {
    bg: "bg-teal-50 shadow-teal-900/10 border-teal-100",
    innerBg: "bg-teal-100/60",
    rings: ["bg-teal-300/50", "bg-teal-400/50", "bg-teal-500/40"],
    button:
      "bg-gradient-to-br from-teal-500 to-teal-700 shadow-teal-600/60 text-white",
    primaryText: "text-teal-950",
    secondaryText: "text-teal-700",
    endButtonHover: "hover:bg-rose-100 text-rose-600",
    endButtonIcon: "text-rose-600",
    iconBg: "bg-teal-200 text-teal-800",
  },
  "agent-speaking": {
    bg: "bg-indigo-50 shadow-indigo-900/10 border-indigo-100",
    innerBg: "bg-indigo-100/60",
    rings: ["bg-indigo-300/50", "bg-indigo-400/50", "bg-indigo-500/40"],
    button:
      "bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-600/60 text-white",
    primaryText: "text-indigo-950",
    secondaryText: "text-indigo-700",
    endButtonHover: "hover:bg-rose-100 text-rose-600",
    endButtonIcon: "text-rose-600",
    iconBg: "bg-indigo-200 text-indigo-800",
  },
  "agent-speaking-muted": {
    bg: "bg-indigo-50/50 shadow-indigo-900/5 border-indigo-100/50",
    innerBg: "bg-indigo-100/30",
    rings: ["bg-indigo-200/30", "bg-indigo-300/30", "bg-indigo-400/20"],
    button:
      "bg-gradient-to-br from-indigo-300 to-indigo-500 shadow-indigo-500/30 text-white",
    primaryText: "text-indigo-900/80",
    secondaryText: "text-indigo-600/80",
    endButtonHover: "hover:bg-rose-100 text-rose-600",
    endButtonIcon: "text-rose-500",
    iconBg: "bg-indigo-100 text-indigo-700/80",
  },
  muted: {
    bg: "bg-slate-50 shadow-slate-900/5 border-slate-100",
    innerBg: "bg-slate-100/50",
    rings: ["bg-slate-200/40", "bg-slate-300/40", "bg-slate-400/40"],
    button:
      "bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-500/30 text-white",
    primaryText: "text-slate-900",
    secondaryText: "text-slate-600",
    endButtonHover: "hover:bg-rose-100 text-rose-600",
    endButtonIcon: "text-rose-500",
    iconBg: "bg-slate-200 text-slate-700",
  },
};

function StatusRow({
  icon: Icon,
  label,
  value,
  iconClassName,
  textClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center border-none text-muted-foreground",
          iconClassName,
        )}
        style={{ borderRadius: "100%" }}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] opacity-70">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-sm leading-6 font-medium transition-colors duration-500 ease-in-out",
            textClassName,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function VoiceStage({
  canRecoverBlockingSession,
  isRecoveringBlockingSession,
  isMuted,
  isUserSpeaking,
  isAgentSpeaking,
  onCancelSetup,
  onEnd,
  onRecoverBlockingSession,
  onRetry,
  onStart,
  onToggleMute,
  session,
  stage,
}: VoiceStageProps) {
  const [audioLevel, setAudioLevel] = useState(0);

  // Audio waveform simulation driven by actual event states
  useEffect(() => {
    if (isUserSpeaking || isAgentSpeaking) {
      const interval = setInterval(() => {
        // Generate a random audio level spike between 0.2 and 1.0 representing active audio volume
        setAudioLevel(0.2 + Math.random() * 0.8);
      }, 120);
      return () => clearInterval(interval);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAudioLevel(0);
    }
  }, [isUserSpeaking, isAgentSpeaking]);

  let activeState: VisualState = stage === "live" ? "listening" : stage;
  if (stage === "live") {
    if (isMuted && isAgentSpeaking) activeState = "agent-speaking-muted";
    else if (isMuted) activeState = "muted";
    else if (isUserSpeaking) activeState = "user-speaking";
    else if (isAgentSpeaking) activeState = "agent-speaking";
    else activeState = "listening";
  }

  const tone = visualToneMap[activeState];
  const showQuickEnd = stage === "connecting" || stage === "live";
  const showBlockingRecoveryAction =
    stage === "failed" && Boolean(canRecoverBlockingSession);

  let CenterIcon = Mic;
  if (activeState === "ready") CenterIcon = Mic;
  else if (activeState === "connecting") CenterIcon = LoaderCircle;
  else if (activeState === "completed" || activeState === "failed")
    CenterIcon = RotateCcw;
  else if (activeState === "listening") CenterIcon = AudioLines;
  else if (activeState === "user-speaking") CenterIcon = User;
  else if (activeState === "agent-speaking") CenterIcon = Bot;
  else if (activeState === "agent-speaking-muted" || activeState === "muted")
    CenterIcon = MicOff;

  const handleCenterAction = () => {
    if (stage === "ready" || stage === "completed") {
      onStart();
      return;
    }
    if (stage === "live") {
      onToggleMute();
      return;
    }
    if (stage === "failed") {
      if (canRecoverBlockingSession && onRecoverBlockingSession) {
        onRecoverBlockingSession();
        return;
      }

      onRetry();
    }
  };

  const PrimaryText = tone.primaryText;
  const SecondaryText = tone.secondaryText;

  // Audio driven scale mappings
  const shouldAnimateBreathing =
    activeState === "user-speaking" ||
    activeState === "agent-speaking" ||
    activeState === "agent-speaking-muted";
  const getScale = (multiplier: number) => {
    if (activeState === "muted") return 0.95;
    if (shouldAnimateBreathing) return 1 + audioLevel * multiplier;
    return 1;
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[2rem] border transition-all duration-500 ease-in-out shadow-xl",
        tone.bg,
      )}
    >
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
        <div
          className={cn(
            "px-6 py-7 text-center transition-colors duration-500 ease-in-out md:px-8 md:py-10",
            tone.innerBg,
          )}
        >
          <div className="flex justify-end relative z-10 min-h-8">
            {showQuickEnd && (
              <Button
                size="icon-sm"
                variant="ghost"
                className={cn(
                  "rounded-2xl bg-white/50 transition-colors",
                  tone.endButtonHover,
                  tone.endButtonIcon,
                )}
                aria-label={stage === "live" ? "End interview" : "Cancel setup"}
                onClick={stage === "live" ? onEnd : onCancelSetup}
              >
                <PhoneOff className="size-4" />
              </Button>
            )}
            {showBlockingRecoveryAction && onRecoverBlockingSession && (
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "rounded-2xl bg-white/60 transition-colors",
                  tone.endButtonHover,
                  tone.endButtonIcon,
                )}
                disabled={isRecoveringBlockingSession}
                onClick={onRecoverBlockingSession}
              >
                {isRecoveringBlockingSession ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <PhoneOff className="mr-2 size-4" />
                )}
                End previous
              </Button>
            )}
          </div>

          <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
            {/* Outer ring wrapper for scale */}
            <div
              className="absolute size-[92%] transition-all duration-300 ease-in-out"
              style={{ transform: `scale(${getScale(0.15)})` }}
            >
              <div
                className={cn(
                  "size-full animate-spin [animation-duration:8s] rounded-[40%_60%_70%_30%/40%_50%_60%_50%]",
                  tone.rings[0],
                )}
              />
            </div>

            {/* Middle ring wrapper for scale */}
            <div
              className="absolute size-[74%] transition-all duration-300 ease-in-out"
              style={{ transform: `scale(${getScale(0.08)})` }}
            >
              <div
                className={cn(
                  "size-full animate-spin [animation-duration:12s] [animation-direction:reverse] rounded-[60%_40%_30%_70%/60%_30%_70%_40%]",
                  tone.rings[1],
                )}
              />
            </div>

            {/* Inner ring wrapper for scale */}
            <div
              className="absolute size-[56%] transition-all duration-300 ease-in-out"
              style={{ transform: `scale(${getScale(0.04)})` }}
            >
              <div
                className={cn(
                  "size-full animate-spin [animation-duration:10s] rounded-[40%_60%_70%_30%/50%_60%_30%_60%]",
                  tone.rings[2],
                )}
              />
            </div>

            <button
              onClick={handleCenterAction}
              disabled={stage === "connecting"}
              className={cn(
                "relative flex size-[42%] items-center justify-center rounded-[50%_50%_40%_60%/60%_40%_60%_40%] shadow-[0_10px_20px_-10px_currentColor] transition-all duration-300 ease-in-out outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
                stage !== "connecting" &&
                  "hover:brightness-110 active:brightness-90 cursor-pointer",
                stage === "connecting" && "cursor-wait opacity-80",
                tone.button,
              )}
              style={{ transform: `scale(${getScale(0.02)})` }}
            >
              <CenterIcon
                className={cn(
                  "size-14",
                  activeState === "connecting" &&
                    "motion-safe:animate-spin [animation-duration:2.8s]",
                )}
              />
            </button>
          </div>
        </div>

        <div className="bg-white/60 p-6 md:p-8 xl:rounded-bl-[3rem] xl:rounded-tl-none border-t border-black/5 xl:border-t-0 xl:border-l relative overflow-hidden">
          {/* Decorative background ping for active states */}
          {(activeState === "user-speaking" ||
            activeState === "agent-speaking" ||
            activeState === "agent-speaking-muted") && (
            <div
              className={cn(
                "absolute top-0 right-0 size-32 opacity-20 blur-3xl rounded-full transition-colors duration-1000",
                activeState === "user-speaking"
                  ? "bg-teal-500"
                  : "bg-indigo-500",
              )}
            />
          )}

          <div className="relative z-10">
            <p
              className={cn(
                "text-sm font-medium transition-colors duration-500 ease-in-out",
                PrimaryText,
              )}
            >
              Session status
            </p>
            <p
              className={cn(
                "mt-1 text-sm leading-6 transition-colors duration-500 ease-in-out",
                SecondaryText,
              )}
            >
              {session.connectionLabel}
            </p>
          </div>

          <div className="mt-8 space-y-6 relative z-10">
            <StatusRow
              icon={Mic}
              label="Microphone"
              value={session.micLabel}
              iconClassName={cn(
                "transition-colors duration-500 ease-in-out rounded-[40%_60%_70%_30%/50%_60%_30%_60%]",
                tone.iconBg,
              )}
              textClassName={PrimaryText}
            />
            <StatusRow
              icon={Clock3}
              label="Elapsed"
              value={session.elapsedLabel}
              iconClassName={cn(
                "transition-colors duration-500 ease-in-out rounded-[50%_50%_40%_60%/60%_40%_60%_40%]",
                tone.iconBg,
              )}
              textClassName={PrimaryText}
            />
            <StatusRow
              icon={AudioLines}
              label="Transcript"
              value={session.transcriptCountLabel}
              iconClassName={cn(
                "transition-colors duration-500 ease-in-out rounded-[60%_40%_30%_70%/60%_30%_70%_40%]",
                tone.iconBg,
              )}
              textClassName={PrimaryText}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
