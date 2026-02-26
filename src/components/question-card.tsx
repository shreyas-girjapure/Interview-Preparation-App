"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  type QuestionProgressState,
  labelQuestionProgressState,
} from "@/lib/interview/question-progress-state";
import type { InterviewQuestionSummary } from "@/lib/interview/questions";
import { cn } from "@/lib/utils";
import { useQuestionProgressContext } from "@/contexts/question-progress-context";

export type QuestionCardProps = {
  question: InterviewQuestionSummary;
  className?: string;
  staggerIndex?: number;
  featured?: boolean;
  layout?: "card" | "list";
  /** @deprecated Pass states to QuestionProgressProvider instead */
  progressState?: QuestionProgressState;
  showProgress?: boolean;
};

export function QuestionCard({
  question,
  className,
  staggerIndex,
  featured = false,
  layout = "card",
  progressState: progressStateProp,
  showProgress = false,
}: QuestionCardProps) {
  // Prefer context-provided state; fall back to explicit prop (for backward compat)
  const contextState = useQuestionProgressContext(question.id);
  const progressState = showProgress
    ? (progressStateProp ?? contextState)
    : undefined;

  const categories = question.categories.length
    ? question.categories
    : [question.category];

  const isRead = progressState === "read";

  const baseClasses = cn(
    "relative flex flex-col h-full rounded-xl border border-border/80 transition-all duration-300 ease-out will-change-transform shadow-sm shadow-transparent hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 active:translate-y-0 active:scale-95 active:shadow-none hover:z-10 overflow-hidden",
    layout === "list" ? "bg-card/70 p-5" : "bg-card/70 p-4",
  );

  // Stagger animation classes
  const staggerClasses =
    staggerIndex !== undefined
      ? "animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
      : "";

  const HeadingTag = layout === "list" ? "h2" : "h3";
  const headingSize =
    layout === "list" ? "text-2xl" : featured ? "text-xl" : "text-lg";

  const summaryClasses =
    layout === "list"
      ? "text-base leading-7 text-muted-foreground"
      : cn(
          "text-sm leading-6 text-muted-foreground",
          !featured && "line-clamp-2",
        );

  return (
    <article
      className={cn(baseClasses, staggerClasses, className, "group")}
      style={
        staggerIndex !== undefined
          ? { animationDelay: `${staggerIndex * 100}ms` }
          : undefined
      }
    >
      <ArrowUpRight
        className={cn(
          "absolute pointer-events-none text-muted-foreground/30 transition-transform group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
          layout === "list"
            ? "top-5 right-5 w-4 h-4"
            : "top-4 right-4 w-3.5 h-3.5",
        )}
      />
      {showProgress && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 transition-colors duration-500",
            isRead ? "bg-green-500" : "bg-transparent",
          )}
        />
      )}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 pr-8",
          layout === "list" || featured ? "mb-3" : "mb-2",
          showProgress && "pl-2",
        )}
      >
        {categories.map((category) => (
          <Badge
            key={`${question.id}-${category}`}
            variant="outline"
            className="text-[10px] sm:text-xs"
          >
            {category}
          </Badge>
        ))}
        {showProgress &&
          progressState &&
          progressState !== "unread" &&
          !isRead && (
            <Badge
              variant="secondary"
              className="text-[10px] sm:text-xs transition-opacity duration-300"
            >
              {labelQuestionProgressState(progressState)}
            </Badge>
          )}
      </div>

      <HeadingTag
        className={cn(
          "font-serif",
          headingSize,
          featured ? "leading-snug" : "leading-tight",
          showProgress && "pl-2 transition-colors duration-300",
        )}
      >
        <Link
          href={`/questions/${question.slug}`}
          className="after:absolute after:inset-0"
          prefetch={false}
        >
          {question.title}
        </Link>
      </HeadingTag>

      <p className={cn(summaryClasses, "mt-2", showProgress && "pl-2")}>
        {question.summary}
      </p>
    </article>
  );
}
