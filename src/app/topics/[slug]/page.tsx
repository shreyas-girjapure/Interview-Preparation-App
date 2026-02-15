import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
import { RelatedTopicsCarousel } from "@/components/related-topics-carousel";
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
      <article className="mx-auto w-full max-w-6xl px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto w-full max-w-[95ch]">
          <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
            <Link href="/topics">Back to topics</Link>
          </Button>
        </div>

        <header className="mx-auto w-full max-w-[95ch] space-y-5">
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

        <Separator className="mx-auto my-9 max-w-[95ch]" />

        <MarkdownContent
          source={topic.overviewMarkdown}
          className="mx-auto w-full max-w-[95ch]"
        />

        <Separator className="mx-auto my-10 max-w-[95ch]" />

        <section className="mx-auto w-full max-w-[95ch] space-y-4">
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
            <ul className="space-y-4">
              {topic.relatedQuestions.map((question) => (
                <li
                  key={question.slug}
                  className="rounded-2xl border border-border/80 bg-card/70 p-5"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {(question.categories.length ? question.categories : [question.category]).map(
                      (category) => (
                        <Badge key={`${question.id}-${category}`} variant="outline">
                          {category}
                        </Badge>
                      ),
                    )}
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

        <Separator className="mx-auto my-10 max-w-[95ch]" />

        <section className="mx-auto w-full max-w-[95ch] space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">Related topics</h2>
          {topic.relatedTopics.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card/70 p-4">
              <p className="text-sm text-muted-foreground">
                No related topics configured yet.
              </p>
            </div>
          ) : (
            <RelatedTopicsCarousel topics={topic.relatedTopics} />
          )}
        </section>
      </article>
    </main>
  );
}
