import { AudioLines, Bot, Sparkles, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type {
  MockTranscriptItem,
  VoiceInterviewMockScenario,
} from "./mock-data";

type TranscriptMockPanelProps = {
  scenario: VoiceInterviewMockScenario;
};

function TranscriptBubble({ item }: { item: MockTranscriptItem }) {
  const isAssistant = item.speaker === "assistant";
  const isSystem = item.speaker === "system";

  return (
    <article
      className={cn(
        "rounded-[1.45rem] border p-4 shadow-sm",
        isSystem &&
          item.tone === "error" &&
          "border-rose-200/80 bg-rose-50/90 text-rose-950",
        isSystem &&
          item.tone !== "error" &&
          "border-amber-200/80 bg-amber-50/90",
        isAssistant &&
          item.tone === "search" &&
          "border-sky-200/80 bg-sky-50/80",
        isAssistant && item.tone !== "search" && "border-border/70 bg-card/95",
        !isAssistant && !isSystem && "border-primary/15 bg-primary/[0.06]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full border",
              isSystem &&
                item.tone === "error" &&
                "border-rose-300 bg-rose-100 text-rose-900",
              isSystem &&
                item.tone !== "error" &&
                "border-amber-300 bg-amber-100 text-amber-900",
              isAssistant &&
                item.tone === "search" &&
                "border-sky-300 bg-sky-100 text-sky-900",
              isAssistant &&
                item.tone !== "search" &&
                "border-border bg-muted text-foreground",
              !isAssistant &&
                !isSystem &&
                "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            {isSystem ? (
              <Sparkles className="size-4" />
            ) : isAssistant ? (
              <Bot className="size-4" />
            ) : (
              <User className="size-4" />
            )}
          </span>
          <span>{item.label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.status === "streaming" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground/80">
              <span className="size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
              Streaming
            </span>
          ) : null}
          <span>{item.meta}</span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-7 text-foreground/90 md:text-[15px]">
        {item.text}
      </p>

      {item.citations?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.citations.map((citation) => (
            <a
              key={citation.href}
              href={citation.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <span className="font-medium">{citation.label}</span>
              <span className="text-muted-foreground">{citation.source}</span>
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function TranscriptMockPanel({ scenario }: TranscriptMockPanelProps) {
  return (
    <section className="rounded-[1.9rem] border border-border/70 bg-background/92 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AudioLines className="size-4" />
            Live transcript
          </div>
          <h2 className="mt-2 font-serif text-3xl tracking-tight">
            Supporting context
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The transcript stays visible so the experience never relies on audio
            alone.
          </p>
        </div>
        <Badge variant="outline">Auto-scroll mock</Badge>
      </div>

      {scenario.completionSummary ? (
        <div className="mt-5 rounded-[1.5rem] border border-lime-200/80 bg-lime-50/90 p-4">
          <p className="text-sm font-medium text-lime-950">
            Completion summary
          </p>
          <p className="mt-2 text-sm leading-6 text-lime-950/85">
            {scenario.completionSummary.summary}
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-lime-950/80">
            <p>
              <span className="font-medium text-lime-950">Strengths:</span>{" "}
              {scenario.completionSummary.strengths}
            </p>
            <p>
              <span className="font-medium text-lime-950">Sharpen:</span>{" "}
              {scenario.completionSummary.sharpen}
            </p>
            <p>
              <span className="font-medium text-lime-950">Next drill:</span>{" "}
              {scenario.completionSummary.nextDrill}
            </p>
          </div>
        </div>
      ) : null}

      {scenario.errorMessage ? (
        <div className="mt-5 rounded-[1.5rem] border border-rose-200/80 bg-rose-50/90 p-4">
          <p className="text-sm font-medium text-rose-950">Failure message</p>
          <p className="mt-2 text-sm leading-6 text-rose-950/85">
            {scenario.errorMessage}
          </p>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {scenario.transcript.map((item) => (
          <TranscriptBubble key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
