import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
import { RelatedQuestionsTwoRowCarousel } from "@/components/related-questions-two-row-carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getTopicBySlug, listTopicSlugs } from "@/lib/interview/questions";

type Params = Promise<{
  slug: string;
}>;

export async function generateStaticParams() {
  const slugs = await listTopicSlugs();

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
  const topic = await getTopicBySlug(slug);

  if (!topic) {
    return {
      title: "Topic not found",
    };
  }

  return {
    title: `${topic.name} | Interview Prep`,
    description: topic.shortDescription,
  };
}

export default async function TopicDetailsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);

  if (!topic) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <article className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto w-full max-w-[95ch]">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-5 h-auto px-0"
          >
            <Link href="/topics">Back to topics</Link>
          </Button>

          <header className="page-copy-enter space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {topic.questionCount} related question
                {topic.questionCount === 1 ? "" : "s"}
              </Badge>
            </div>
            <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
              {topic.name}
            </h1>
            <p className="text-base leading-8 text-foreground/70 md:text-lg">
              {topic.shortDescription}
            </p>
          </header>

          <Separator className="my-7" />

          <MarkdownContent source={topic.overviewMarkdown} className="w-full" />

          <Separator className="my-8" />

          <section className="space-y-4">
            <h2 className="font-serif text-2xl tracking-tight">
              Related questions
            </h2>
            {topic.relatedQuestions.length === 0 ? (
              <div className="rounded-xl border border-border/80 bg-card/70 p-4">
                <p className="text-sm text-muted-foreground">
                  No questions are linked to this topic yet.
                </p>
              </div>
            ) : (
              <RelatedQuestionsTwoRowCarousel
                questions={topic.relatedQuestions}
              />
            )}
          </section>
        </div>
      </article>
    </main>
  );
}
