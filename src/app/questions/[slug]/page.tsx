import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getQuestionBySlug,
  listQuestionSlugs,
} from "@/lib/interview/questions";

type Params = Promise<{
  slug: string;
}>;

export function generateStaticParams() {
  return listQuestionSlugs().map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const question = getQuestionBySlug(slug);

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
  const question = getQuestionBySlug(slug);

  if (!question) {
    notFound();
  }

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
        </header>

        <Separator className="my-8" />

        <MarkdownContent source={question.answerMarkdown} />
      </article>
    </main>
  );
}
