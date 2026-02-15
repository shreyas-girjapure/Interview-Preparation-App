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

import type { RelatedQuestionMock } from "@/app/design/related-questions-samples/right-rail-related-questions";

type QuestionPair = [RelatedQuestionMock, RelatedQuestionMock?];

function toPairs(questions: RelatedQuestionMock[]) {
  const pairs: QuestionPair[] = [];

  for (let index = 0; index < questions.length; index += 2) {
    pairs.push([questions[index]!, questions[index + 1]]);
  }

  return pairs;
}

function QuestionCard({ question }: { question: RelatedQuestionMock }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/70 p-4">
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
    </div>
  );
}

export function TwoRowRelatedQuestionsCarousel({
  questions,
}: {
  questions: RelatedQuestionMock[];
}) {
  if (!questions.length) {
    return null;
  }

  const pairs = toPairs(questions);

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
          {pairs.map(([top, bottom]) => (
            <CarouselItem
              key={top.slug}
              className="basis-[300px] md:basis-[340px] lg:basis-[360px]"
            >
              <div className="flex h-full flex-col gap-3">
                <QuestionCard question={top} />
                {bottom ? <QuestionCard question={bottom} /> : null}
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
