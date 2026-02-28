import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuestionCard } from "@/components/question-card";
import { QuestionProgressProvider } from "@/contexts/question-progress-context";
import { SortDropdown, type SortOption } from "@/components/sort-dropdown";
import { paginateItems, parsePositiveInt } from "@/lib/pagination";
import { sortQuestions } from "@/lib/interview/questions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getTopicBySlug, listTopicSlugs } from "@/lib/interview/questions";
import { listViewerQuestionProgressStates } from "@/lib/interview/question-progress";

type Params = Promise<{
  slug: string;
}>;

type SearchParams = Promise<{
  page?: string | string[];
  sort?: string | string[];
}>;

export const dynamic = "force-dynamic";

const TOPIC_PAGE_SIZE = 10;

const SORT_OPTIONS: SortOption[] = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Recently Modified", value: "recently-modified" },
  { label: "Alphabetical", value: "alphabetical" },
];

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

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 1) {
    return [1];
  }

  const candidates = new Set<number>([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  return Array.from(candidates)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function getHref(
  slug: string,
  current: URLSearchParams,
  updates: {
    page?: number | null;
  },
) {
  const next = new URLSearchParams(current.toString());

  if (updates.page === null) {
    next.delete("page");
  } else if (typeof updates.page === "number") {
    if (updates.page <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(updates.page));
    }
  }

  const queryString = next.toString();
  return queryString ? `/topics/${slug}?${queryString}` : `/topics/${slug}`;
}

export default async function TopicDetailsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);

  const rawParams = await searchParams;

  if (!topic) {
    notFound();
  }

  const requestedPage = parsePositiveInt(getSingleValue(rawParams.page), 1);
  const sortOption = getSingleValue(rawParams.sort);

  const sortedQuestions = sortQuestions(topic.relatedQuestions, sortOption);

  const pagination = paginateItems(
    sortedQuestions,
    requestedPage,
    TOPIC_PAGE_SIZE,
  );

  const visiblePages = getVisiblePages(pagination.page, pagination.totalPages);

  const { statesByQuestionId } = await listViewerQuestionProgressStates(
    pagination.items.map((q) => q.id),
  );

  const currentQuery = new URLSearchParams();

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <article className="mx-auto w-full max-w-7xl px-6 py-6 md:px-10 md:py-8">
        <div className="mx-auto w-full">
          <header className="page-copy-enter space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {topic.subcategory && (
                <Badge variant="outline" className="capitalize">
                  {topic.subcategory}
                </Badge>
              )}
              <Badge variant="secondary">
                {topic.questionCount} related question
                {topic.questionCount === 1 ? "" : "s"}
              </Badge>
            </div>
            <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
              {topic.name}
            </h1>
            <p className="max-w-4xl text-base leading-8 text-muted-foreground md:text-lg">
              {topic.shortDescription}
            </p>
          </header>

          <Separator className="my-6" />

          <section className="pt-2">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.start}-{pagination.end} of{" "}
                {pagination.total} question{pagination.total === 1 ? "" : "s"}
              </p>
              {pagination.total > 1 && (
                <SortDropdown options={SORT_OPTIONS} defaultSort="newest" />
              )}
            </div>

            {pagination.total === 0 ? (
              <div className="rounded-xl border border-border/80 bg-card/70 p-6">
                <p className="text-muted-foreground">
                  No questions are linked to this topic yet.
                </p>
              </div>
            ) : (
              <>
                <QuestionProgressProvider states={statesByQuestionId}>
                  <ul className="space-y-4">
                    {pagination.items.map((question, index) => (
                      <li key={question.id} className="block">
                        <QuestionCard
                          question={question}
                          staggerIndex={index}
                          showProgress={true}
                          layout="list"
                        />
                      </li>
                    ))}
                  </ul>
                </QuestionProgressProvider>

                {pagination.totalPages > 1 ? (
                  <nav
                    aria-label="Topic questions pagination"
                    className="flex flex-wrap items-center gap-2 pt-2"
                  >
                    {pagination.hasPreviousPage ? (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={getHref(slug, currentQuery, {
                            page: pagination.page - 1,
                          })}
                          scroll={false}
                        >
                          Previous
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        Previous
                      </Button>
                    )}

                    {visiblePages.map((pageNumber) => (
                      <Button
                        key={pageNumber}
                        asChild
                        size="sm"
                        variant={
                          pageNumber === pagination.page ? "default" : "outline"
                        }
                      >
                        <Link
                          href={getHref(slug, currentQuery, {
                            page: pageNumber,
                          })}
                          scroll={false}
                        >
                          {pageNumber}
                        </Link>
                      </Button>
                    ))}

                    {pagination.hasNextPage ? (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={getHref(slug, currentQuery, {
                            page: pagination.page + 1,
                          })}
                          scroll={false}
                        >
                          Next
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        Next
                      </Button>
                    )}

                    <span className="ml-1 text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                  </nav>
                ) : null}
              </>
            )}
          </section>
        </div>
      </article>
    </main>
  );
}
