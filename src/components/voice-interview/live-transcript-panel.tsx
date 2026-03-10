"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AudioLines, Bot, ChevronDown, Sparkles, User } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  VoiceInterviewSessionSnapshot,
  VoiceInterviewTranscriptItem,
} from "@/lib/interview/voice-interview-session";

type LiveTranscriptPanelProps = {
  session: VoiceInterviewSessionSnapshot;
};

function TranscriptBubble({ item }: { item: VoiceInterviewTranscriptItem }) {
  const isAssistant = item.speaker === "assistant";
  const isSystem = item.speaker === "system";

  return (
    <article
      className={cn(
        "rounded-[1.35rem] border p-4 shadow-sm",
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
              key={`${citation.href}-${citation.label}`}
              href={citation.href}
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

const transcriptTitleMap = {
  ready: "Transcript preview",
  connecting: "Connection log",
  live: "Live transcript",
  completed: "Interview wrap-up",
  failed: "Session log",
} satisfies Record<VoiceInterviewSessionSnapshot["stage"], string>;

function TranscriptStateBlock({
  session,
}: {
  session: VoiceInterviewSessionSnapshot;
}) {
  if (session.stage === "completed" && session.completionSummary) {
    return (
      <div className="rounded-[1.45rem] border border-lime-200/80 bg-lime-50/90 p-4 text-lime-950">
        <p className="text-sm font-medium">Completion summary</p>
        <p className="mt-2 text-sm leading-6 text-lime-950/85">
          {session.completionSummary.summary}
        </p>
        <div className="mt-4 space-y-3 text-sm leading-6 text-lime-950/80">
          <p>
            <span className="font-medium text-lime-950">Strengths:</span>{" "}
            {session.completionSummary.strengths}
          </p>
          <p>
            <span className="font-medium text-lime-950">Sharpen:</span>{" "}
            {session.completionSummary.sharpen}
          </p>
          <p>
            <span className="font-medium text-lime-950">Next drill:</span>{" "}
            {session.completionSummary.nextDrill}
          </p>
        </div>
      </div>
    );
  }

  if (session.stage === "failed" && session.errorMessage) {
    return (
      <div className="rounded-[1.45rem] border border-rose-200/80 bg-rose-50/90 p-4 text-rose-950">
        <p className="text-sm font-medium">Session issue</p>
        <p className="mt-2 text-sm leading-6 text-rose-950/85">
          {session.errorMessage}
        </p>
      </div>
    );
  }

  return null;
}

export function LiveTranscriptPanel({ session }: LiveTranscriptPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);
  const latestTranscriptItem =
    session.transcript[session.transcript.length - 1];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const container = scrollRef.current;

    if (!container) {
      return;
    }

    const updatePinnedState = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      pinnedToBottomRef.current = distanceFromBottom < 72;
    };

    updatePinnedState();
    container.addEventListener("scroll", updatePinnedState, { passive: true });

    return () => {
      container.removeEventListener("scroll", updatePinnedState);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!pinnedToBottomRef.current) {
      return;
    }

    endRef.current?.scrollIntoView({
      block: "end",
      behavior:
        latestTranscriptItem?.status === "streaming" ? "auto" : "smooth",
    });
  }, [
    latestTranscriptItem?.id,
    latestTranscriptItem?.status,
    latestTranscriptItem?.text,
    isOpen,
    session.stage,
    session.transcript.length,
  ]);

  return (
    <section className="rounded-[1.7rem] border border-border/70 bg-background/92 p-2 shadow-sm backdrop-blur">
      <button
        type="button"
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="flex w-full flex-col gap-3 rounded-[1.35rem] px-4 py-3 text-left transition-colors hover:bg-accent/35 md:flex-row md:items-center md:justify-between"
        onClick={() => setIsOpen((current) => !current)}
      >
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AudioLines className="size-4" />
            Transcript
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isOpen
              ? "Hide the transcript and return full attention to the voice stage."
              : "Open the transcript only when you want to review turns, citations, or connection state."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-sm font-medium text-foreground">
            {isOpen ? "Hide transcript" : "Show transcript"}
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                isOpen && "rotate-180",
              )}
            />
          </span>
        </div>
      </button>

      {isOpen ? (
        <div id={panelId} className="border-t border-border/60 px-4 pb-4 pt-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-3xl tracking-tight">
                {transcriptTitleMap[session.stage]}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                One transcript surface adapts from setup to live turns to
                wrap-up without crowding the stage by default.
              </p>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="mt-5 h-[28rem] overflow-y-auto pr-1 md:h-[34rem]"
          >
            <div className="space-y-4">
              <TranscriptStateBlock session={session} />

              {session.transcript.map((item) => (
                <TranscriptBubble key={item.id} item={item} />
              ))}

              <div ref={endRef} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
