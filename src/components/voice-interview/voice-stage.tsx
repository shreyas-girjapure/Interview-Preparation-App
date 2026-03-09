import {
  AudioLines,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mic,
  PhoneOff,
  Radio,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  VoiceInterviewSessionSnapshot,
  VoiceInterviewStage,
} from "@/lib/interview/voice-interview-session";

type VoiceStageProps = {
  scopeLabel: string;
  session: VoiceInterviewSessionSnapshot;
};

const stageToneMap: Record<
  VoiceInterviewStage,
  {
    badgeClassName: string;
    innerClassName: string;
    ringClassNames: [string, string, string];
  }
> = {
  ready: {
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-900",
    innerClassName:
      "bg-[linear-gradient(180deg,oklch(0.36_0.03_240),oklch(0.28_0.022_240))] text-white",
    ringClassNames: [
      "border-sky-200/80",
      "border-sky-300/70",
      "border-sky-400/55",
    ],
  },
  connecting: {
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-950",
    innerClassName:
      "bg-[linear-gradient(180deg,oklch(0.52_0.11_73),oklch(0.42_0.08_71))] text-white",
    ringClassNames: [
      "border-amber-300/80 motion-safe:animate-pulse",
      "border-amber-400/60 motion-safe:animate-pulse [animation-delay:180ms]",
      "border-orange-400/45 motion-safe:animate-pulse [animation-delay:320ms]",
    ],
  },
  live: {
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-950",
    innerClassName:
      "bg-[linear-gradient(180deg,oklch(0.33_0.04_160),oklch(0.24_0.028_164))] text-white",
    ringClassNames: [
      "border-emerald-300/80 motion-safe:animate-pulse",
      "border-emerald-400/65 motion-safe:animate-pulse [animation-delay:180ms]",
      "border-teal-400/45 motion-safe:animate-pulse [animation-delay:320ms]",
    ],
  },
  completed: {
    badgeClassName: "border-lime-200 bg-lime-50 text-lime-950",
    innerClassName:
      "bg-[linear-gradient(180deg,oklch(0.44_0.05_134),oklch(0.33_0.038_132))] text-white",
    ringClassNames: [
      "border-lime-300/80",
      "border-lime-400/60",
      "border-emerald-400/45",
    ],
  },
  failed: {
    badgeClassName: "border-rose-200 bg-rose-50 text-rose-950",
    innerClassName:
      "bg-[linear-gradient(180deg,oklch(0.52_0.18_25),oklch(0.42_0.15_25))] text-white",
    ringClassNames: [
      "border-rose-300/80",
      "border-rose-400/65",
      "border-red-400/45",
    ],
  },
};

const stageIconMap = {
  ready: Mic,
  connecting: LoaderCircle,
  live: Waves,
  completed: CheckCircle2,
  failed: PhoneOff,
} satisfies Record<VoiceInterviewStage, typeof Waves>;

function StageDetail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof AudioLines;
}) {
  return (
    <div className="rounded-[1.4rem] border border-border/60 bg-background/82 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-foreground">
        {value}
      </p>
    </div>
  );
}

export function VoiceStage({ scopeLabel, session }: VoiceStageProps) {
  const stageTone = stageToneMap[session.stage];
  const StageIcon = stageIconMap[session.stage];

  return (
    <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(165deg,rgba(255,252,248,0.97),rgba(246,241,233,0.97))] shadow-[0_26px_90px_-54px_rgba(70,45,26,0.55)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 md:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Voice stage</Badge>
            <Badge variant="outline">{scopeLabel}</Badge>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                stageTone.badgeClassName,
              )}
            >
              {session.stageLabel}
            </span>
          </div>
          <h2 className="mt-2 font-serif text-3xl tracking-tight">
            {session.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            {session.description}
          </p>
        </div>

        <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm text-muted-foreground">
          {session.stateNote}
        </div>
      </div>

      <div className="rounded-[1.8rem] px-5 py-6 text-center md:px-6">
        <div className="rounded-[1.8rem] border border-border/60 bg-background/80 px-6 py-8">
          <div className="relative mx-auto flex size-64 items-center justify-center md:size-72">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(205,143,82,0.19)_0%,rgba(205,143,82,0)_68%)] blur-xl" />
            <div
              className={cn(
                "absolute size-[92%] rounded-full border",
                stageTone.ringClassNames[0],
              )}
            />
            <div
              className={cn(
                "absolute size-[74%] rounded-full border",
                stageTone.ringClassNames[1],
              )}
            />
            <div
              className={cn(
                "absolute size-[56%] rounded-full border",
                stageTone.ringClassNames[2],
              )}
            />
            <div
              className={cn(
                "relative flex size-[42%] items-center justify-center rounded-full shadow-[0_18px_50px_-20px_rgba(46,32,18,0.85)]",
                session.stage === "connecting" &&
                  "motion-safe:animate-spin [animation-duration:2.8s]",
                stageTone.innerClassName,
              )}
            >
              <StageIcon className="size-14" />
            </div>
          </div>

          <p className="mt-6 font-serif text-3xl tracking-tight">
            &ldquo;{session.stageQuote}&rdquo;
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            {session.stageSupport}
          </p>

          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            <StageDetail
              label="Microphone"
              value={session.micLabel}
              icon={Mic}
            />
            <StageDetail
              label="Connection"
              value={session.connectionLabel}
              icon={Radio}
            />
            <StageDetail
              label="Elapsed"
              value={session.elapsedLabel}
              icon={Clock3}
            />
            <StageDetail
              label="Transcript"
              value={session.transcriptCountLabel}
              icon={AudioLines}
            />
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-amber-200/80 bg-amber-50/90 p-4 text-left">
            <p className="text-sm font-medium text-amber-950">
              Recency handling
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-950/80">
              {session.recencyModeLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
