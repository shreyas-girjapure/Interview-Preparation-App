"use client";

import { useState, useEffect } from "react";
import {
  AudioLines,
  Clock3,
  Mic,
  MicOff,
  PhoneOff,
  User,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// In the "live" state, we have 4 sub-states representing Voice Activity Detection (VAD)
type VADState = "listening" | "user-speaking" | "agent-speaking" | "muted";
type ToneState = VADState | "agent-speaking-muted";

const vadToneMap: Record<
  ToneState,
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
  // Quiet state - neither is speaking
  listening: {
    bg: "bg-emerald-50 shadow-emerald-900/5",
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
  // User is actively speaking
  "user-speaking": {
    bg: "bg-teal-50 shadow-teal-900/10",
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
  // AI is actively speaking back
  "agent-speaking": {
    bg: "bg-indigo-50 shadow-indigo-900/10",
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
  // Agent is actively speaking, but user has explicitly muted themselves
  "agent-speaking-muted": {
    bg: "bg-indigo-50/50 shadow-indigo-900/5",
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
  // User muted themselves
  muted: {
    bg: "bg-slate-50 shadow-slate-900/5",
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

type StatusRowProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  iconClassName?: string;
  textClassName?: string;
};

function StatusRow({
  icon: Icon,
  label,
  value,
  iconClassName,
  textClassName,
}: StatusRowProps) {
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

export function ActiveVADStates() {
  const [vadState, setVadState] = useState<VADState>("listening");
  const [autoSimulate, setAutoSimulate] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // In a real app, VAD and Mute would be separate states.
  // For this simulation, we'll use a separate state to track if the agent is currently speaking
  // so we can still animate the breathing while the user is "muted"
  const [simulatedAgentSpeaking, setSimulatedAgentSpeaking] = useState(false);

  // Audio waveform simulation
  useEffect(() => {
    if (
      vadState === "user-speaking" ||
      vadState === "agent-speaking" ||
      simulatedAgentSpeaking
    ) {
      const interval = setInterval(() => {
        // Generate a random audio level spike between 0.2 and 1.0
        setAudioLevel(0.2 + Math.random() * 0.8);
      }, 120); // Update rapidly like voice waveforms
      return () => clearInterval(interval);
    } else {
      // Smoothly drop back to 0 when quiet
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAudioLevel(0);
    }
  }, [vadState, simulatedAgentSpeaking]);

  // Auto-simulation effect
  useEffect(() => {
    if (!autoSimulate) return;

    let timeout: NodeJS.Timeout;
    let step = 0;

    const scenarios: { vad: VADState; agent: boolean; time: number }[] = [
      { vad: "listening", agent: false, time: 2000 },
      { vad: "user-speaking", agent: false, time: 3000 },
      { vad: "listening", agent: false, time: 1000 },
      { vad: "agent-speaking", agent: false, time: 3500 },
      { vad: "listening", agent: false, time: 1000 },
      { vad: "user-speaking", agent: false, time: 1500 },
      { vad: "agent-speaking", agent: false, time: 2000 },
      { vad: "listening", agent: false, time: 1500 },
      { vad: "muted", agent: false, time: 2500 },
      { vad: "muted", agent: true, time: 3500 }, // Agent responds while user is muted
      { vad: "muted", agent: false, time: 1500 },
    ];

    const cycle = () => {
      const nextScenario = scenarios[step % scenarios.length];
      setVadState(nextScenario.vad);
      setSimulatedAgentSpeaking(nextScenario.agent);

      step++;
      timeout = setTimeout(cycle, nextScenario.time);
    };

    // Start cycling
    timeout = setTimeout(cycle, 1000);
    return () => clearTimeout(timeout);
  }, [autoSimulate]);

  // Active Tone selection logic.
  // If we're strictly muted, but the agent is simulated speaking, use the subtle muted agent theme!
  const activeState: ToneState =
    vadState === "muted" && simulatedAgentSpeaking
      ? "agent-speaking-muted"
      : vadState;
  const tone = vadToneMap[activeState];

  let connectionLabel = "Connected and active";
  let CenterIcon = AudioLines;

  if (activeState === "listening") {
    connectionLabel = "Quiet (listening...)";
    CenterIcon = AudioLines;
  } else if (activeState === "user-speaking") {
    connectionLabel = "You are speaking";
    CenterIcon = User;
  } else if (activeState === "agent-speaking") {
    connectionLabel = "Agent is answering";
    CenterIcon = Bot;
  } else if (activeState === "agent-speaking-muted") {
    connectionLabel = "Agent answering (You are muted)";
    CenterIcon = MicOff;
  } else if (activeState === "muted") {
    connectionLabel = "You are muted";
    CenterIcon = MicOff;
  }

  const PrimaryText = tone.primaryText;
  const SecondaryText = tone.secondaryText;

  return (
    <div className="mt-8">
      {/* State Toggle Buttons for Testing */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        {(
          [
            "listening",
            "user-speaking",
            "agent-speaking",
            "muted",
          ] as VADState[]
        ).map((s) => (
          <Button
            key={s}
            variant={vadState === s && !autoSimulate ? "default" : "outline"}
            className="capitalize"
            onClick={() => {
              setAutoSimulate(false);
              setVadState(s);
            }}
          >
            {s.replace("-", " ")}
          </Button>
        ))}
      </div>

      <div className="mb-12 flex justify-center">
        <Button
          variant={autoSimulate ? "default" : "secondary"}
          onClick={() => {
            if (!autoSimulate && vadState === "muted") setVadState("listening");
            setAutoSimulate(!autoSimulate);
          }}
          className="rounded-full px-8"
        >
          {autoSimulate ? "Stop Simulation" : "▶ Start Random VAD Simulation"}
        </Button>
      </div>

      <div className="mx-auto max-w-4xl">
        <section
          className={cn(
            "overflow-hidden rounded-[3rem] border-none shadow-xl transition-all duration-500 ease-in-out",
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
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className={cn(
                    "rounded-2xl bg-white/50 transition-colors",
                    tone.endButtonHover,
                    tone.endButtonIcon,
                  )}
                  aria-label="End"
                >
                  <PhoneOff className="size-4" />
                </Button>
              </div>

              <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
                {/* Outer ring wrapper for scale */}
                <div
                  className="absolute size-[92%] transition-all duration-300 ease-in-out"
                  style={{
                    transform: `scale(${activeState === "muted" ? 0.95 : 1 + audioLevel * 0.15})`,
                  }}
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
                  style={{
                    transform: `scale(${activeState === "muted" ? 0.95 : 1 + audioLevel * 0.08})`,
                  }}
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
                  style={{
                    transform: `scale(${activeState === "muted" ? 0.95 : 1 + audioLevel * 0.04})`,
                  }}
                >
                  <div
                    className={cn(
                      "size-full animate-spin [animation-duration:10s] rounded-[40%_60%_70%_30%/50%_60%_30%_60%]",
                      tone.rings[2],
                    )}
                  />
                </div>

                <button
                  onClick={() => {
                    setAutoSimulate(false);
                    setVadState(vadState === "muted" ? "listening" : "muted");
                  }}
                  className={cn(
                    "relative flex size-[42%] items-center justify-center rounded-[50%_50%_40%_60%/60%_40%_60%_40%] shadow-[0_10px_20px_-10px_currentColor] transition-all duration-300 ease-in-out hover:brightness-110 active:brightness-90",
                    tone.button,
                  )}
                  style={{
                    transform: `scale(${activeState === "muted" ? 0.95 : 1 + audioLevel * 0.02})`,
                  }}
                >
                  <CenterIcon className="size-14" />
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
                  {connectionLabel}
                </p>
              </div>

              <div className="mt-8 space-y-6 relative z-10">
                <StatusRow
                  icon={Mic}
                  label="Microphone"
                  value={vadState === "muted" ? "Muted" : "Active"}
                  iconClassName={cn(
                    "transition-colors duration-500 ease-in-out rounded-[40%_60%_70%_30%/50%_60%_30%_60%]",
                    tone.iconBg,
                  )}
                  textClassName={PrimaryText}
                />
                <StatusRow
                  icon={Clock3}
                  label="Elapsed"
                  value="08:45"
                  iconClassName={cn(
                    "transition-colors duration-500 ease-in-out rounded-[50%_50%_40%_60%/60%_40%_60%_40%]",
                    tone.iconBg,
                  )}
                  textClassName={PrimaryText}
                />
                <StatusRow
                  icon={AudioLines}
                  label="Transcript"
                  value={
                    activeState === "listening" || activeState === "muted"
                      ? "Listening..."
                      : "32 messages"
                  }
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
      </div>
    </div>
  );
}
