import Link from "next/link";

import { TopicCard } from "@/components/topic-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listTopics } from "@/lib/interview/questions";
import { paginateItems, parsePositiveInt } from "@/lib/pagination";

type SearchParams = Promise<{
  search?: string | string[];
  page?: string | string[];
}>;

const TOPICS_PAGE_SIZE = 12;

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getHref(current: URLSearchParams, updates: { page?: number | null }) {
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
  return queryString ? `/topics?${queryString}` : "/topics";
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

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawParams = await searchParams;
  const search = getSingleValue(rawParams.search)?.trim() ?? "";
  const requestedPage = parsePositiveInt(getSingleValue(rawParams.page), 1);
  const topics = await listTopics({ search });
  const pagination = paginateItems(topics, requestedPage, TOPICS_PAGE_SIZE);
  const visiblePages = getVisiblePages(pagination.page, pagination.totalPages);

  const currentQuery = new URLSearchParams();
  if (search) currentQuery.set("search", search);

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10 md:py-16">
        <header className="space-y-4">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            Topic Catalog
          </Badge>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            Start from topics, then branch into questions
          </h1>
          <p className="max-w-4xl text-base leading-8 text-muted-foreground md:text-lg">
            Explore core interview concepts first. Each topic page links into
            relevant questions and adjacent concepts for deeper learning.
          </p>
        </header>

        <Separator className="my-8" />

        <section className="space-y-6">
          <form className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/70 p-4 md:flex-row md:items-center">
            <label htmlFor="search" className="text-sm font-medium">
              Search topics
            </label>
            <input
              id="search"
              name="search"
              defaultValue={search}
              placeholder="e.g. event loop, caching, reconciliation"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring md:max-w-md"
            />
            <Button type="submit" size="sm" className="md:ml-auto">
              Apply
            </Button>
            {search ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/topics" scroll={false}>
                  Clear
                </Link>
              </Button>
            ) : null}
          </form>

          <p className="text-sm text-muted-foreground">
            Showing {pagination.start}-{pagination.end} of {pagination.total}{" "}
            topic{pagination.total === 1 ? "" : "s"}
          </p>

          {pagination.total === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card/70 p-6">
              <p className="text-muted-foreground">
                No topics match this search. Try a broader term.
              </p>
            </div>
          ) : (
            <>
              <ul className="grid gap-4 md:grid-cols-2">
                {pagination.items.map((topic, index) => (
                  <li key={topic.slug} className="block">
                    <TopicCard
                      topic={topic}
                      staggerIndex={index}
                      showQuestionCount={true}
                      layout="list"
                    />
                  </li>
                ))}
              </ul>

              {pagination.totalPages > 1 ? (
                <nav
                  aria-label="Topics pagination"
                  className="flex flex-wrap items-center gap-2 pt-2"
                >
                  {pagination.hasPreviousPage ? (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={getHref(currentQuery, {
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
                        href={getHref(currentQuery, { page: pageNumber })}
                        scroll={false}
                      >
                        {pageNumber}
                      </Link>
                    </Button>
                  ))}

                  {pagination.hasNextPage ? (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={getHref(currentQuery, {
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
    </main>
  );
}
