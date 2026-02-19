"use client";

import Link from "next/link";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import type { InterviewQuestionSummary } from "@/lib/interview/questions";

type QuestionPair = [InterviewQuestionSummary, InterviewQuestionSummary?];

function toQuestionPairs(questions: InterviewQuestionSummary[]) {
  const pairs: QuestionPair[] = [];

  for (let index = 0; index < questions.length; index += 2) {
    pairs.push([questions[index]!, questions[index + 1]]);
  }

  return pairs;
}

function QuestionCard({ question }: { question: InterviewQuestionSummary }) {
  const categories = question.categories.length
    ? question.categories
    : [question.category];

  return (
    <article className="flex h-[220px] flex-col rounded-xl border border-border/80 bg-card/70 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {categories.slice(0, 2).map((category) => (
          <Badge key={`${question.id}-${category}`} variant="outline">
            {category}
          </Badge>
        ))}
      </div>
      <h3 className="font-serif text-lg leading-tight">
        <Link
          href={`/questions/${question.slug}`}
          className="underline-offset-4 hover:underline"
        >
          {question.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {question.summary}
      </p>
    </article>
  );
}

export function RelatedQuestionsTwoRowCarousel({
  questions,
}: {
  questions: InterviewQuestionSummary[];
}) {
  if (!questions.length) {
    return null;
  }

  if (questions.length <= 4) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {questions.map((question) => (
          <QuestionCard key={question.id} question={question} />
        ))}
      </div>
    );
  }

  const pairs = toQuestionPairs(questions);

  return (
    <div className="relative">
      <Carousel
        opts={{
          align: "start",
          dragFree: false,
        }}
        className="w-full"
      >
        <CarouselContent>
          {pairs.map(([topQuestion, bottomQuestion]) => (
            <CarouselItem
              key={topQuestion.id}
              className="basis-[300px] md:basis-[340px] lg:basis-[360px]"
            >
              <div className="flex h-full flex-col gap-3">
                <QuestionCard question={topQuestion} />
                {bottomQuestion ? (
                  <QuestionCard question={bottomQuestion} />
                ) : (
                  <div
                    aria-hidden
                    className="h-[220px] rounded-xl border border-transparent"
                  />
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          variant="ghost"
          className="left-2 z-20 h-9 w-9 rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm transition hover:bg-background disabled:opacity-30"
        />
        <CarouselNext
          variant="ghost"
          className="right-2 z-20 h-9 w-9 rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm transition hover:bg-background disabled:opacity-30"
        />
      </Carousel>
    </div>
  );
}
