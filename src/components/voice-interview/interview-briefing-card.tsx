import Link from "next/link";
import { BookOpenText, ListChecks, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

type InterviewBriefingCardProps = {
  scope: VoiceInterviewScope;
};

export function InterviewBriefingCard({ scope }: InterviewBriefingCardProps) {
  return (
    <section className="rounded-[1.9rem] border border-border/70 bg-background/92 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpenText className="size-4" />
            Interview briefing
          </div>
          <h2 className="mt-2 font-serif text-3xl tracking-tight">
            Stay on scope
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The session stays anchored to one topic at a time so the
            conversation never drifts into a general assistant.
          </p>
        </div>
        <Badge variant="outline">{scope.scopeLabel}</Badge>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-border/60 bg-card/90 p-4">
        <p className="text-sm text-muted-foreground">Active topic</p>
        <p className="mt-2 font-semibold tracking-tight">{scope.title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {scope.summary}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href={`/topics/${scope.slug}`}>Review topic page</Link>
        </Button>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-amber-200/80 bg-amber-50/90 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-950">
          <ShieldCheck className="size-4" />
          Stay in scope
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-950/85">
          {scope.stayInScope}
        </p>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-border/60 bg-card/90 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListChecks className="size-4" />
          Expectations
        </div>
        <ul className="mt-3 space-y-3 text-sm leading-6 text-foreground/90">
          {scope.expectations.map((expectation) => (
            <li
              key={expectation}
              className="rounded-2xl bg-background/80 px-3 py-2"
            >
              {expectation}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-border/60 bg-card/90 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4" />
          Try asking
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {scope.starterPrompts.map((prompt) => (
            <span
              key={prompt}
              className="rounded-full border border-border/70 bg-background px-3 py-2 text-sm leading-5 text-foreground"
            >
              {prompt}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-border/60 bg-card/90 p-4">
        <p className="text-sm text-muted-foreground">Question map</p>
        <ul className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
          {scope.questionMap.length ? (
            scope.questionMap.map((question) => (
              <li
                key={question}
                className="rounded-2xl bg-background/80 px-3 py-2"
              >
                {question}
              </li>
            ))
          ) : (
            <li className="rounded-2xl bg-background/80 px-3 py-2">
              The topic briefing is ready even when linked practice questions
              are still being curated.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
