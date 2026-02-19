import Link from "next/link";

import { FeaturedContentRail } from "@/components/featured-content-rail";
import { FeaturedQuestionCard } from "@/components/featured-question-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listFeaturedQuestions } from "@/lib/interview/questions";

export default async function Home() {
  const featuredQuestions = await listFeaturedQuestions(8);

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10 md:py-20">
        <header className="space-y-5">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            Interview Preparation
          </Badge>
          <h1 className="max-w-5xl font-serif text-4xl leading-tight tracking-tight text-foreground md:text-6xl">
            Practice interview questions with structured answers.
          </h1>
          <p className="max-w-4xl text-base leading-8 text-muted-foreground md:text-lg">
            Build confidence with concise explanations, realistic code snippets,
            and topic-first learning paths that let you go deeper through
            related concepts.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild variant="secondary">
              <Link href="/playlists">Browse playlists</Link>
            </Button>
            <Button asChild>
              <Link href="/topics">Browse topics</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/questions">Browse all questions</Link>
            </Button>
          </div>
        </header>

        <Separator className="my-10 bg-border/80" />

        <section className="space-y-4">
          <h2 className="font-serif text-3xl tracking-tight">
            Featured Questions
          </h2>

          {featuredQuestions.length ? (
            <FeaturedContentRail
              mode="carousel"
              gridClassName="md:grid-cols-3"
              carouselItemClassName="basis-[280px] md:basis-[320px] lg:basis-[360px]"
            >
              {featuredQuestions.map((question) => (
                <FeaturedQuestionCard key={question.id} question={question} />
              ))}
            </FeaturedContentRail>
          ) : (
            <div className="rounded-xl border border-border/80 bg-card/70 p-4 text-sm text-muted-foreground">
              Featured questions will appear here once published content is
              available.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
