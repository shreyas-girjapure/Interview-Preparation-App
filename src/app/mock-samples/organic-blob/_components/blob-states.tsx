"use client";

import { useState } from "react";
import {
  AudioLines,
  Clock3,
  Mic,
  MicOff,
  PhoneOff,
  LoaderCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VoiceInterviewStage } from "@/lib/interview/voice-interview-session";

const STAGES: VoiceInterviewStage[] = [
  "ready",
  "connecting",
  "live",
  "completed",
  "failed",
];

const stageToneMap: Record<
  VoiceInterviewStage,
  {
    bg: string;
    innerBg: string;
    rings: [string, string, string];
    button: string;
    buttonIconBg: string; // for connecting state
    primaryText: string;
    secondaryText: string;
    endButtonHover: string;
    endButtonIcon: string;
    iconBg: string;
  }
> = {
  ready: {
    bg: "bg-sky-50 shadow-sky-900/5",
    innerBg: "bg-sky-100/50",
    rings: ["bg-sky-200/40", "bg-sky-300/40", "bg-sky-400/40"],
    button:
      "bg-gradient-to-br from-sky-400 to-sky-600 shadow-sky-500/50 text-white",
    buttonIconBg: "",
    primaryText: "text-sky-900",
    secondaryText: "text-sky-600",
    endButtonHover: "hover:bg-sky-200 text-sky-700",
    endButtonIcon: "text-sky-700",
    iconBg: "bg-sky-100 text-sky-700",
  },
  connecting: {
    bg: "bg-amber-50 shadow-amber-900/5",
    innerBg: "bg-amber-100/50",
    rings: ["bg-amber-200/40", "bg-amber-300/40", "bg-amber-400/40"],
    button:
      "bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/50 text-amber-950",
    buttonIconBg: "",
    primaryText: "text-amber-900",
    secondaryText: "text-amber-700",
    endButtonHover: "hover:bg-rose-100 text-rose-600",
    endButtonIcon: "text-rose-600",
    iconBg: "bg-amber-100 text-amber-700",
  },
  live: {
    bg: "bg-emerald-50 shadow-emerald-900/5",
    innerBg: "bg-emerald-100/50",
    rings: ["bg-emerald-200/40", "bg-emerald-300/40", "bg-emerald-400/40"],
    button:
      "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/50 text-white",
    buttonIconBg: "",
    primaryText: "text-emerald-900",
    secondaryText: "text-emerald-600",
    endButtonHover: "hover:bg-rose-100 text-rose-600",
    endButtonIcon: "text-rose-600",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  completed: {
    bg: "bg-lime-50 shadow-lime-900/5",
    innerBg: "bg-lime-100/50",
    rings: ["bg-lime-200/40", "bg-lime-300/40", "bg-lime-400/40"],
    button:
      "bg-gradient-to-br from-lime-500 to-lime-700 shadow-lime-500/50 text-white",
    buttonIconBg: "",
    primaryText: "text-lime-900",
    secondaryText: "text-lime-700",
    endButtonHover: "hover:bg-lime-200 text-lime-800",
    endButtonIcon: "text-lime-800",
    iconBg: "bg-lime-100 text-lime-700",
  },
  failed: {
    bg: "bg-rose-50 shadow-rose-900/5",
    innerBg: "bg-rose-100/50",
    rings: ["bg-rose-200/40", "bg-rose-300/40", "bg-rose-400/40"],
    button:
      "bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/50 text-white",
    buttonIconBg: "",
    primaryText: "text-rose-900",
    secondaryText: "text-rose-600",
    endButtonHover: "hover:bg-rose-200 text-rose-700",
    endButtonIcon: "text-rose-700",
    iconBg: "bg-rose-100 text-rose-700",
  },
};

const stageIconMap = {
  ready: Mic,
  connecting: LoaderCircle,
  live: AudioLines,
  completed: CheckCircle2,
  failed: RotateCcw,
};

type StatusRowProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  iconClassName?: string;
  textClassName?: string;
  wrapperRadius?: string;
};

function StatusRow({
  icon: Icon,
  label,
  value,
  iconClassName,
  textClassName,
  wrapperRadius = "100%",
}: StatusRowProps) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center border-none text-muted-foreground",
          iconClassName,
        )}
        style={{ borderRadius: wrapperRadius }}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] opacity-70">
          {label}
        </p>
        <p className={cn("mt-1 text-sm leading-6 font-medium", textClassName)}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function OrganicBlobStates() {
  const [stage, setStage] = useState<VoiceInterviewStage>("ready");
  const [isMuted, setIsMuted] = useState(false);

  const tone = stageToneMap[stage];
  const CenterIcon = stageIconMap[stage];

  // Derive mock content based on stage
  let connectionLabel = "";
  if (stage === "ready") connectionLabel = "Ready to start";
  else if (stage === "connecting") connectionLabel = "Connecting to agent...";
  else if (stage === "live") connectionLabel = "Connected and listening";
  else if (stage === "completed")
    connectionLabel = "Interview session completed";
  else if (stage === "failed") connectionLabel = "Connection failed";

  let micLabel = isMuted ? "Muted" : "Active";
  if (stage === "ready" || stage === "completed" || stage === "failed")
    micLabel = "Inactive";
  else if (stage === "connecting") micLabel = "Waiting...";

  let elapsedLabel = "00:00";
  if (stage === "live") elapsedLabel = "04:20";
  else if (stage === "completed") elapsedLabel = "15:30";

  const handleCenterAction = () => {
    if (stage === "ready") setStage("connecting");
    else if (stage === "connecting") setStage("live");
    else if (stage === "live") setIsMuted(!isMuted);
    else if (stage === "completed") setStage("ready");
    else if (stage === "failed") setStage("connecting");
  };

  const PrimaryText = tone.primaryText;
  const SecondaryText = tone.secondaryText;
  const showQuickEnd = stage === "connecting" || stage === "live";

  return (
    <div className="mt-8">
      {/* State Toggle Buttons for Testing */}
      <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
        {STAGES.map((s) => (
          <Button
            key={s}
            variant={stage === s ? "default" : "outline"}
            className="capitalize"
            onClick={() => setStage(s)}
          >
            {s} State
          </Button>
        ))}
      </div>

      <div className="mx-auto max-w-4xl">
        <section
          className={cn(
            "overflow-hidden rounded-[3rem] border-none shadow-xl transition-colors duration-700",
            tone.bg,
          )}
        >
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
            <div
              className={cn(
                "px-6 py-7 text-center transition-colors duration-700 md:px-8 md:py-10",
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
                    onClick={() => setStage("completed")}
                    aria-label="End"
                  >
                    <PhoneOff className="size-4" />
                  </Button>
                )}
              </div>

              <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
                <div
                  className={cn(
                    "absolute size-[92%] animate-spin [animation-duration:8s] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] transition-colors duration-700",
                    tone.rings[0],
                  )}
                />
                <div
                  className={cn(
                    "absolute size-[74%] animate-spin [animation-duration:12s] [animation-direction:reverse] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] transition-colors duration-700",
                    tone.rings[1],
                  )}
                />
                <div
                  className={cn(
                    "absolute size-[56%] animate-spin [animation-duration:10s] rounded-[40%_60%_70%_30%/50%_60%_30%_60%] transition-colors duration-700",
                    tone.rings[2],
                  )}
                />

                <button
                  onClick={handleCenterAction}
                  className={cn(
                    "relative flex size-[42%] items-center justify-center rounded-[50%_50%_40%_60%/60%_40%_60%_40%] shadow-[0_10px_20px_-10px_currentColor] transition-all hover:scale-105 active:scale-95 duration-500",
                    tone.button,
                    stage === "connecting" && "animate-pulse",
                  )}
                >
                  {isMuted && stage === "live" ? (
                    <MicOff className="size-14" />
                  ) : (
                    <CenterIcon
                      className={cn(
                        "size-14",
                        stage === "connecting" &&
                          "animate-spin [animation-duration:2.8s]",
                      )}
                    />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-white/60 p-6 md:p-8 xl:rounded-bl-[3rem] xl:rounded-tl-none border-t border-black/5 xl:border-t-0 xl:border-l">
              <div>
                <p className={cn("text-sm font-medium", PrimaryText)}>
                  Session status
                </p>
                <p className={cn("mt-1 text-sm leading-6", SecondaryText)}>
                  {connectionLabel}
                </p>
              </div>

              <div className="mt-8 space-y-6">
                <StatusRow
                  icon={Mic}
                  label="Microphone"
                  value={micLabel}
                  iconClassName={tone.iconBg}
                  textClassName={PrimaryText}
                  wrapperRadius="40% 60% 70% 30% / 50% 60% 30% 60%"
                />
                <StatusRow
                  icon={Clock3}
                  label="Elapsed"
                  value={elapsedLabel}
                  iconClassName={tone.iconBg}
                  textClassName={PrimaryText}
                  wrapperRadius="50% 50% 40% 60% / 60% 40% 60% 40%"
                />
                <StatusRow
                  icon={AudioLines}
                  label="Transcript"
                  value={stage === "ready" ? "0 messages" : "12 messages"}
                  iconClassName={tone.iconBg}
                  textClassName={PrimaryText}
                  wrapperRadius="60% 40% 30% 70% / 60% 30% 70% 40%"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
