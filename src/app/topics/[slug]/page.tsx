import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
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
      <article className="mx-auto w-full max-w-[74ch] px-6 py-12 md:py-16">
        <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
          <Link href="/topics">Back to topics</Link>
        </Button>

        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {topic.questionCount} related question
              {topic.questionCount === 1 ? "" : "s"}
            </Badge>
          </div>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            {topic.name}
          </h1>
          <p className="text-base leading-8 text-muted-foreground md:text-lg">
            {topic.shortDescription}
          </p>
        </header>

        <Separator className="my-8" />

        <MarkdownContent source={topic.overviewMarkdown} />

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
            <ul className="space-y-3">
              {topic.relatedQuestions.map((question) => (
                <li
                  key={question.slug}
                  className="rounded-xl border border-border/80 bg-card/70 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{question.category}</Badge>
                    <Badge variant="secondary">
                      {question.difficulty.toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="font-serif text-xl leading-tight">
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
          )}
        </section>

        <Separator className="my-8" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">Related topics</h2>
          {topic.relatedTopics.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card/70 p-4">
              <p className="text-sm text-muted-foreground">
                No related topics configured yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {topic.relatedTopics.map((relatedTopic) => (
                <div
                  key={relatedTopic.slug}
                  className="rounded-xl border border-border/80 bg-card/70 p-4"
                >
                  <h3 className="font-serif text-xl leading-tight">
                    <Link
                      href={`/topics/${relatedTopic.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {relatedTopic.name}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {relatedTopic.shortDescription}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </article>
    </main>
  );
}
