import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { InterviewQuestionSummary } from "@/lib/interview/questions";

export function FeaturedQuestionCard({
  question,
}: {
  question: InterviewQuestionSummary;
}) {
  const categories = question.categories.length
    ? question.categories
    : [question.category];

  return (
    <article className="h-full rounded-xl border border-border/80 bg-card/70 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {categories.map((category) => (
          <Badge key={`${question.id}-${category}`} variant="outline">
            {category}
          </Badge>
        ))}
      </div>

      <h3 className="font-serif text-xl leading-snug">
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
    </article>
  );
}
