import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
import { QuestionProgressHeader } from "@/components/question-progress-header";
import { RelatedQuestionsTwoRowCarousel } from "@/components/related-questions-two-row-carousel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listViewerQuestionProgressStates } from "@/lib/interview/question-progress";
import {
  getQuestionBySlug,
  listRelatedQuestionsForQuestion,
  listQuestionSlugs,
  listTopicsForQuestion,
} from "@/lib/interview/questions";

export const dynamic = "force-dynamic";

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

  const [{ isAuthenticated, statesByQuestionId }, linkedTopics, relatedQuestions] =
    await Promise.all([
      listViewerQuestionProgressStates([question.id]),
      listTopicsForQuestion(question),
      listRelatedQuestionsForQuestion(question, 12),
    ]);

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <article className="mx-auto w-full max-w-6xl px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto w-full max-w-[95ch]">
          <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
            <Link href="/questions">Back to catalog</Link>
          </Button>
        </div>

        <header className="mx-auto w-full max-w-[95ch] space-y-5">
          <QuestionProgressHeader
            questionId={question.id}
            categories={
              question.categories.length
                ? question.categories
                : [question.category]
            }
            initialState={statesByQuestionId[question.id] ?? "unread"}
            isAuthenticated={isAuthenticated}
          />
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            {question.title}
          </h1>
          <p className="text-base leading-8 text-foreground/70 md:text-lg">
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

        <Separator className="mx-auto my-9 max-w-[95ch]" />

        <MarkdownContent
          source={question.answerMarkdown}
          className="mx-auto w-full max-w-[95ch]"
        />

        {relatedQuestions.length ? (
          <>
            <Separator className="mx-auto my-10 max-w-[95ch]" />
            <section className="mx-auto w-full max-w-[95ch] space-y-4">
              <h2 className="font-serif text-2xl tracking-tight">
                Related Questions
              </h2>
              <RelatedQuestionsTwoRowCarousel questions={relatedQuestions} />
            </section>
          </>
        ) : null}
      </article>
    </main>
  );
}
