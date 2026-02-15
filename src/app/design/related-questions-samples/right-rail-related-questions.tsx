"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type RelatedQuestionMock = {
  slug: string;
  title: string;
  summary: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedMinutes: number;
  reason: string;
  track: "direct" | "broader";
};

type RailMode = "infinite" | "load-more";

const BATCH_SIZE = 5;

function getTrackLabel(track: "all" | "direct" | "broader") {
  if (track === "direct") {
    return "Direct";
  }

  if (track === "broader") {
    return "Broader";
  }

  return "All";
}

function QuestionRow({ question }: { question: RelatedQuestionMock }) {
  return (
    <li className="rounded-xl border border-border/80 bg-card/70 p-4">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {question.reason}
      </p>
      <h3 className="mt-1 font-serif text-lg leading-tight">
        <Link
          href={`/questions/${question.slug}`}
          className="underline-offset-4 hover:underline"
        >
          {question.title}
        </Link>
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {question.summary}
      </p>
    </li>
  );
}

export function RightRailRelatedQuestions({
  questions,
  mode,
}: {
  questions: RelatedQuestionMock[];
  mode: RailMode;
}) {
  const [track, setTrack] = useState<"all" | "direct" | "broader">("all");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (track === "all") {
      return questions;
    }

    return questions.filter((question) => question.track === track);
  }, [questions, track]);

  const visible = filtered.slice(0, visibleCount);
  const canLoadMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    listRef.current?.scrollTo({ top: 0 });
  }, [track]);

  useEffect(() => {
    if (mode !== "infinite") {
      return;
    }

    const root = listRef.current;
    const target = sentinelRef.current;

    if (!root || !target || !canLoadMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }

        setVisibleCount((current) =>
          Math.min(current + BATCH_SIZE, filtered.length),
        );
      },
      {
        root,
        rootMargin: "120px",
        threshold: 0.05,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [mode, canLoadMore, filtered.length]);

  return (
    <aside className="rounded-2xl border border-border/80 bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Related questions
        </p>
        <Badge variant="secondary" className="text-[11px]">
          {getTrackLabel(track)}
        </Badge>
      </div>

      <div
        role="tablist"
        aria-label="Related question tracks"
        className="mb-3 grid grid-cols-3 gap-2"
      >
        {(["all", "direct", "broader"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={track === value ? "default" : "outline"}
            onClick={() => setTrack(value)}
          >
            {getTrackLabel(value)}
          </Button>
        ))}
      </div>

      <div
        ref={listRef}
        className="max-h-[620px] space-y-3 overflow-y-auto pr-1"
        aria-live={mode === "infinite" ? "polite" : undefined}
      >
        <ul className="space-y-3">
          {visible.map((question) => (
            <QuestionRow key={`${mode}-${question.slug}`} question={question} />
          ))}
        </ul>
        <div ref={sentinelRef} className="h-1" />
      </div>

      {mode === "load-more" && canLoadMore ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() =>
            setVisibleCount((current) =>
              Math.min(current + BATCH_SIZE, filtered.length),
            )
          }
        >
          Load more related questions
        </Button>
      ) : null}
    </aside>
  );
}
