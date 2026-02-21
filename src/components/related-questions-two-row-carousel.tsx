"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { QuestionCard } from "@/components/question-card";
import type { InterviewQuestionSummary } from "@/lib/interview/questions";

type QuestionPair = [InterviewQuestionSummary, InterviewQuestionSummary?];

function toQuestionPairs(questions: InterviewQuestionSummary[]) {
  const pairs: QuestionPair[] = [];

  for (let index = 0; index < questions.length; index += 2) {
    pairs.push([questions[index]!, questions[index + 1]]);
  }

  return pairs;
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
        <CarouselContent className="py-2">
          {pairs.map(([topQuestion, bottomQuestion]) => (
            <CarouselItem
              key={topQuestion.id}
              className="basis-[300px] md:basis-[340px] lg:basis-[360px]"
            >
              <div className="flex h-full flex-col gap-3">
                <QuestionCard question={topQuestion} className="h-[220px]" />
                {bottomQuestion ? (
                  <QuestionCard
                    question={bottomQuestion}
                    className="h-[220px]"
                  />
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
