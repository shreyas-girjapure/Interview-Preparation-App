import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getQuestionBySlug,
  listRabbitHoleTopics,
  listQuestionSlugs,
  listTopicsForQuestion,
} from "@/lib/interview/questions";

type Params = Promise<{
  slug: string;
}>;

export async function generateStaticParams() {
  const slugs = await listQuestionSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const question = await getQuestionBySlug(slug);

  if (!question) {
    return {
      title: "Question not found",
    };
  }

  return {
    title: `${question.title} | Interview Prep`,
    description: question.summary,
  };
}

export default async function QuestionDetailsPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const question = await getQuestionBySlug(slug);

  if (!question) {
    notFound();
  }

  const [linkedTopics, rabbitHoleTopics] = await Promise.all([
    listTopicsForQuestion(question),
    listRabbitHoleTopics(question, 4),
  ]);

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <article className="mx-auto w-full max-w-[74ch] px-6 py-12 md:py-16">
        <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
          <Link href="/questions">Back to catalog</Link>
        </Button>

        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{question.category}</Badge>
            <Badge variant="secondary">
              {question.difficulty.toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              ~{question.estimatedMinutes} min answer
            </span>
          </div>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            {question.title}
          </h1>
          <p className="text-base leading-8 text-muted-foreground md:text-lg">
            {question.summary}
          </p>
          {linkedTopics.length ? (
            <div className="pt-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Linked topics
              </p>
              <div className="flex flex-wrap gap-2">
                {linkedTopics.map((topic) => (
                  <Button key={topic.slug} asChild variant="outline" size="sm">
                    <Link href={`/topics/${topic.slug}`}>{topic.name}</Link>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        <Separator className="my-8" />

        <MarkdownContent source={question.answerMarkdown} />

        {rabbitHoleTopics.length ? (
          <>
            <Separator className="my-8" />
            <section className="space-y-3">
              <h2 className="font-serif text-2xl tracking-tight">
                Continue the rabbit-hole
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {rabbitHoleTopics.map((topic) => (
                  <div
                    key={topic.slug}
                    className="rounded-xl border border-border/80 bg-card/70 p-4"
                  >
                    <h3 className="font-serif text-xl leading-tight">
                      <Link
                        href={`/topics/${topic.slug}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {topic.name}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {topic.shortDescription}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </article>
    </main>
  );
}
