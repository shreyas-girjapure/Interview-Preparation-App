import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Tag } from "lucide-react";

import { MarkdownContent } from "@/components/markdown-content";
import { QuestionProgressHeader } from "@/components/question-progress-header";
import { RelatedQuestionsTwoRowCarousel } from "@/components/related-questions-two-row-carousel";
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

  const [
    { isAuthenticated, statesByQuestionId },
    linkedTopics,
    relatedQuestions,
  ] = await Promise.all([
    listViewerQuestionProgressStates([question.id]),
    listTopicsForQuestion(question),
    listRelatedQuestionsForQuestion(question, 12),
  ]);

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <article className="mx-auto w-full max-w-6xl px-6 pt-6 pb-8 md:px-10 md:pt-10 md:pb-12">
        <div className="mx-auto w-full max-w-[95ch]">
          <header className="page-copy-enter space-y-3 mt-2">
            <QuestionProgressHeader
              questionId={question.id}
              categories={
                question.categories.length
                  ? question.categories
                  : [question.category]
              }
              initialState={statesByQuestionId[question.id] ?? "unread"}
              isAuthenticated={isAuthenticated}
              showActions={false}
            />
            <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
              {question.title}
            </h1>
            <p className="text-base leading-8 text-foreground/70 md:text-lg">
              {question.summary}
            </p>
            {linkedTopics.length > 0 && (
              <div className="pt-2 flex flex-col sm:flex-row justify-end gap-4">
                <div className="flex flex-wrap items-center sm:justify-end gap-x-6 gap-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5 shrink-0">
                    <Tag className="w-3.5 h-3.5" />
                    Related Topics
                  </h3>
                  {linkedTopics.map((topic) => (
                    <Link
                      key={topic.slug}
                      href={`/topics/${topic.slug}`}
                      className="group flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 sm:no-underline sm:hover:underline"
                    >
                      {topic.name}
                      <ArrowUpRight className="ml-1 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </header>

          <Separator className="my-5" />

          <MarkdownContent
            source={question.answerMarkdown}
            className="mobile-wrap-code w-full"
          />

          {relatedQuestions.length ? (
            <>
              <Separator className="my-6" />
              <section className="space-y-4">
                <h2 className="font-serif text-2xl tracking-tight">
                  Related Questions
                </h2>
                <RelatedQuestionsTwoRowCarousel questions={relatedQuestions} />
              </section>
            </>
          ) : null}
        </div>
      </article>
    </main>
  );
}
