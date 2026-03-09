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

  const linkedTopicsPromise = listTopicsForQuestion(question);
  const relatedQuestionsPromise = listRelatedQuestionsForQuestion(question, 12);

  const [linkedTopics, relatedQuestions] = await Promise.all([
    linkedTopicsPromise,
    relatedQuestionsPromise,
  ]);

  const questionIds = [question.id, ...relatedQuestions.map((q) => q.id)];
  const { isAuthenticated, statesByQuestionId } =
    await listViewerQuestionProgressStates(questionIds);

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <article className="mx-auto w-full max-w-6xl px-5 pt-6 pb-8 md:px-10 md:pt-10 md:pb-12">
        <div className="mx-auto w-full max-w-[95ch]">
          <header className="page-copy-enter mt-2 space-y-4 md:space-y-5">
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
            <h1 className="question-detail-title">{question.title}</h1>
            <p className="question-detail-summary">{question.summary}</p>
            {linkedTopics.length > 0 && (
              <div className="pt-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                  <h3 className="flex shrink-0 items-center gap-1.5 text-xs leading-4 font-semibold uppercase tracking-[0.11em] text-muted-foreground/80">
                    <Tag className="w-3.5 h-3.5" />
                    Related Topics
                  </h3>
                  {linkedTopics.map((topic) => (
                    <Link
                      key={topic.slug}
                      href={`/topics/${topic.slug}`}
                      className="group flex items-center text-sm leading-6 font-medium text-foreground/72 transition-colors underline decoration-current/45 underline-offset-4 hover:text-foreground hover:decoration-current md:text-[0.95rem]"
                    >
                      {topic.name}
                      <ArrowUpRight className="ml-1 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </header>

          <Separator className="my-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both delay-[520ms] md:my-8" />

          <MarkdownContent
            source={question.answerMarkdown}
            className="question-detail-prose w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both delay-[620ms]"
          />

          {relatedQuestions.length ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both delay-[720ms]">
              <Separator className="my-8 md:my-10" />
              <section className="space-y-5 md:space-y-6">
                <h2 className="question-detail-section-title">
                  Related Questions
                </h2>
                <RelatedQuestionsTwoRowCarousel
                  questions={relatedQuestions}
                  statesByQuestionId={statesByQuestionId}
                />
              </section>
            </div>
          ) : null}
        </div>
      </article>
    </main>
  );
}
