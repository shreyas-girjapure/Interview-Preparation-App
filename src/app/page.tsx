import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listFeaturedQuestions } from "@/lib/interview/questions";

export default async function Home() {
  const featuredQuestions = await listFeaturedQuestions(3);
  const firstFeaturedQuestion = featuredQuestions[0];

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
            Practice high-signal interview questions with structured answers.
          </h1>
          <p className="max-w-4xl text-base leading-8 text-muted-foreground md:text-lg">
            Build confidence with concise explanations, realistic code snippets,
            and topic-first learning paths that let you go deeper through
            related concepts.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild>
              <Link href="/topics">Browse topics</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/questions">Browse all questions</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/account">Track your progress</Link>
            </Button>
            {firstFeaturedQuestion ? (
              <Button asChild variant="outline">
                <Link href={`/questions/${firstFeaturedQuestion.slug}`}>
                  Open a sample answer
                </Link>
              </Button>
            ) : null}
          </div>
        </header>

        <Separator className="my-10 bg-border/80" />

        <section className="space-y-4">
          <h2 className="font-serif text-3xl tracking-tight">
            Featured Questions
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {featuredQuestions.map((question) => (
              <li
                key={question.id}
                className="rounded-xl border border-border/80 bg-card/70 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="outline">{question.category}</Badge>
                  <Badge variant="secondary">
                    {question.difficulty.toUpperCase()}
                  </Badge>
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
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
