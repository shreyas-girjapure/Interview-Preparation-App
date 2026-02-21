import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
    "relative h-full flex flex-col rounded-2xl border border-border/80 transition-all duration-300 ease-out will-change-transform shadow-sm shadow-transparent hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 active:translate-y-0 active:scale-95 active:shadow-none hover:z-10",
    layout === "list" ? "bg-card/70 p-5" : "bg-card/70 p-4",
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
      className={cn(baseClasses, staggerClasses, className, "group")}
      style={
        staggerIndex !== undefined
          ? { animationDelay: `${staggerIndex * 100}ms` }
          : undefined
      }
    >
      <ArrowUpRight className="absolute pointer-events-none top-4 right-4 sm:top-5 sm:right-5 w-4 h-4 text-muted-foreground/30 transition-transform group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      {showQuestionCount && topic.questionCount !== undefined && (
        <div
          className={cn(
            "flex items-center gap-2 pr-8",
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
          "font-serif pr-8",
          headingSize,
          layout === "list" ? "leading-snug" : "leading-tight",
        )}
      >
        <Link
          href={`/topics/${topic.slug}`}
          className="after:absolute after:inset-0"
          prefetch={false}
        >
          {topic.name}
        </Link>
      </HeadingTag>
      <p className={cn(summaryClasses, "mt-2")}>{topic.shortDescription}</p>
    </div>
  );
}
