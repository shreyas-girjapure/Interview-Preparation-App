import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type TopicCardData = {
  slug: string;
  name: string;
  shortDescription: string;
  questionCount?: number;
};

export type TopicCardProps = {
  topic: TopicCardData;
  className?: string;
  staggerIndex?: number;
  layout?: "card" | "list";
  showQuestionCount?: boolean;
};

export function TopicCard({
  topic,
  className,
  staggerIndex,
  layout = "card",
  showQuestionCount = false,
}: TopicCardProps) {
  const baseClasses = cn(
    "relative h-full flex flex-col rounded-2xl border border-border/80 transition-all duration-300 ease-out will-change-transform shadow-sm shadow-transparent hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 active:translate-y-0 active:scale-95 active:shadow-none hover:z-10",
    layout === "list" ? "bg-card/70 p-5" : "bg-card/70 p-5",
  );

  const staggerClasses =
    staggerIndex !== undefined
      ? "animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
      : "";

  const HeadingTag = layout === "list" ? "h2" : "h3";
  const headingSize = layout === "list" ? "text-2xl" : "text-xl";

  const summaryClasses =
    layout === "list"
      ? "text-base leading-7 text-muted-foreground"
      : "text-sm leading-6 text-muted-foreground line-clamp-2";

  return (
    <div
      className={cn(baseClasses, staggerClasses, className)}
      style={
        staggerIndex !== undefined
          ? { animationDelay: `${staggerIndex * 100}ms` }
          : undefined
      }
    >
      {showQuestionCount && topic.questionCount !== undefined && (
        <div
          className={cn(
            "flex items-center gap-2",
            layout === "list" ? "mb-3" : "mb-2",
          )}
        >
          <Badge variant="outline">
            {topic.questionCount} question
            {topic.questionCount === 1 ? "" : "s"}
          </Badge>
        </div>
      )}
      <HeadingTag
        className={cn(
          "font-serif",
          headingSize,
          layout === "list" ? "leading-snug" : "leading-tight",
        )}
      >
        <Link
          href={`/topics/${topic.slug}`}
          className="underline-offset-4 hover:underline"
          prefetch={false}
        >
          {topic.name}
        </Link>
      </HeadingTag>
      <p className={cn(summaryClasses, "mt-2")}>{topic.shortDescription}</p>
    </div>
  );
}
