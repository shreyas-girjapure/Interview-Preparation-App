import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { QuestionProgressHeader } from "@/components/question-progress-header";
import type { InterviewQuestionSummary } from "@/lib/interview/questions";
import { cn } from "@/lib/utils";
import { type QuestionProgressState } from "@/lib/interview/question-progress-state";

export type QuestionCardProps = {
  question: InterviewQuestionSummary;
  className?: string;
  staggerIndex?: number;
  featured?: boolean;
  layout?: "card" | "list";
  progressState?: QuestionProgressState;
  isAuthenticated?: boolean;
  showProgress?: boolean;
};

export function QuestionCard({
  question,
  className,
  staggerIndex,
  featured = false,
  layout = "card",
  progressState,
  isAuthenticated = false,
  showProgress = false,
}: QuestionCardProps) {
  const categories = question.categories.length
    ? question.categories
    : [question.category];

  const baseClasses = cn(
    "relative flex flex-col h-full rounded-xl border border-border/80 transition-all duration-300 ease-out will-change-transform shadow-sm shadow-transparent hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 active:translate-y-0 active:scale-95 active:shadow-none hover:z-10",
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
      className={cn(baseClasses, staggerClasses, className)}
      style={
        staggerIndex !== undefined
          ? { animationDelay: `${staggerIndex * 100}ms` }
          : undefined
      }
    >
      {showProgress && progressState ? (
        <QuestionProgressHeader
          questionId={question.id}
          categories={categories}
          initialState={progressState}
          isAuthenticated={isAuthenticated}
          showActions={false}
          className="mb-3"
        />
      ) : (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            layout === "list" || featured ? "mb-3" : "mb-2",
          )}
        >
          {categories.map((category) => (
            <Badge key={`${question.id}-${category}`} variant="outline">
              {category}
            </Badge>
          ))}
        </div>
      )}

      <HeadingTag
        className={cn(
          "font-serif",
          headingSize,
          featured ? "leading-snug" : "leading-tight",
        )}
      >
        <Link
          href={`/questions/${question.slug}`}
          className="underline-offset-4 hover:underline"
          prefetch={false}
        >
          {question.title}
        </Link>
      </HeadingTag>

      <p className={cn(summaryClasses, "mt-2")}>{question.summary}</p>
    </article>
  );
}
