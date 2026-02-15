import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { requireAdminPageAccess } from "@/lib/auth/admin-access";

import { PreviewPublishControls } from "./publish-controls";

export const dynamic = "force-dynamic";

type Params = Promise<{
  slug: string;
}>;

type CategoryRelation =
  | {
      slug: string | null;
      name: string | null;
    }
  | Array<{
      slug: string | null;
      name: string | null;
    }>;

type TopicRelation =
  | {
      slug: string | null;
      name: string | null;
      status: string | null;
      categories: CategoryRelation | null;
    }
  | Array<{
      slug: string | null;
      name: string | null;
      status: string | null;
      categories: CategoryRelation | null;
    }>;

type QuestionRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string | null;
  question_topics: Array<{
    sort_order: number | null;
    topics: TopicRelation | null;
  }> | null;
};

type AnswerRow = {
  title: string | null;
  content_markdown: string | null;
  status: string | null;
};

function pickSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function collectCategories(questionTopics: QuestionRow["question_topics"]) {
  if (!questionTopics?.length) {
    return [];
  }

  const items = questionTopics
    .map((entry) => ({
      sortOrder: entry.sort_order ?? Number.MAX_SAFE_INTEGER,
      topic: pickSingle(entry.topics),
    }))
    .filter((entry) => Boolean(entry.topic))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const seen = new Set<string>();
  const categories: string[] = [];

  for (const item of items) {
    const category = pickSingle(item.topic?.categories);
    const categorySlug = category?.slug?.trim().toLowerCase();
    const categoryName = category?.name?.trim();

    if (!categorySlug || !categoryName || seen.has(categorySlug)) {
      continue;
    }

    seen.add(categorySlug);
    categories.push(categoryName);
  }

  return categories;
}

function collectTopicNames(questionTopics: QuestionRow["question_topics"]) {
  if (!questionTopics?.length) {
    return [];
  }

  const items = questionTopics
    .map((entry) => ({
      sortOrder: entry.sort_order ?? Number.MAX_SAFE_INTEGER,
      topic: pickSingle(entry.topics),
    }))
    .filter((entry) => Boolean(entry.topic?.name))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return Array.from(
    new Set(items.map((item) => item.topic?.name?.trim()).filter(Boolean)),
  ) as string[];
}

export default async function AdminQuestionPreviewPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const { supabase } = await requireAdminPageAccess(
    `/admin/questions/preview/${slug}`,
  );

  const { data: questionData, error: questionError } = await supabase
    .from("questions")
    .select(
      `
        id,
        slug,
        title,
        summary,
        status,
        question_topics(
          sort_order,
          topics(
            slug,
            name,
            status,
            categories(
              slug,
              name
            )
          )
        )
      `,
    )
    .eq("slug", slug)
    .maybeSingle<QuestionRow>();

  if (questionError) {
    throw new Error(
      `Unable to load admin preview question: ${questionError.message}`,
    );
  }

  if (!questionData) {
    notFound();
  }

  const { data: answerRows, error: answerError } = await supabase
    .from("answers")
    .select("title, content_markdown, status")
    .eq("question_id", questionData.id)
    .eq("is_primary", true)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (answerError) {
    throw new Error(
      `Unable to load admin preview answer: ${answerError.message}`,
    );
  }

  const answer = ((answerRows as AnswerRow[] | null) ?? [])[0];
  const categories = collectCategories(questionData.question_topics);
  const topicNames = collectTopicNames(questionData.question_topics);

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <article className="mx-auto w-full max-w-6xl px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto w-full max-w-[95ch] space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href="/admin">Back to admin composer</Link>
            </Button>
            <Badge variant="secondary">Preview Mode</Badge>
            <Badge variant="outline">
              Question status: {questionData.status ?? "draft"}
            </Badge>
            <Badge variant="outline">
              Answer status: {answer?.status ?? "missing"}
            </Badge>
          </div>
          <PreviewPublishControls questionSlug={questionData.slug} />
        </div>

        <Separator className="mx-auto my-8 max-w-[95ch]" />

        <header className="mx-auto w-full max-w-[95ch] space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {categories.length ? (
              categories.map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">Uncategorized</Badge>
            )}
          </div>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            {questionData.title}
          </h1>
          <p className="text-base leading-8 text-foreground/70 md:text-lg">
            {questionData.summary?.trim() ||
              "No summary provided for this draft yet."}
          </p>
          {topicNames.length ? (
            <div className="pt-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Linked topics
              </p>
              <div className="flex flex-wrap gap-2">
                {topicNames.map((topicName) => (
                  <Badge key={topicName} variant="outline">
                    {topicName}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        <Separator className="mx-auto my-9 max-w-[95ch]" />

        <MarkdownContent
          source={
            answer?.content_markdown?.trim() ||
            "Primary answer markdown has not been added yet."
          }
          className="mx-auto w-full max-w-[95ch]"
        />
      </article>
    </main>
  );
}
