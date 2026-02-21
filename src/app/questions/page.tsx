import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listViewerQuestionProgressStates } from "@/lib/interview/question-progress";
import { listQuestions } from "@/lib/interview/questions";
import { paginateItems, parsePositiveInt } from "@/lib/pagination";
import { QuestionCard } from "@/components/question-card";

type SearchParams = Promise<{
  page?: string | string[];
}>;

const QUESTIONS_PAGE_SIZE = 10;
export const dynamic = "force-dynamic";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getHref(
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
  return queryString ? `/questions?${queryString}` : "/questions";
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

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawParams = await searchParams;

  const requestedPage = parsePositiveInt(getSingleValue(rawParams.page), 1);

  const questions = await listQuestions();

  const pagination = paginateItems(
    questions,
    requestedPage,
    QUESTIONS_PAGE_SIZE,
  );
  const visiblePages = getVisiblePages(pagination.page, pagination.totalPages);
  const { isAuthenticated, statesByQuestionId } =
    await listViewerQuestionProgressStates(
      pagination.items.map((question) => question.id),
    );

  const currentQuery = new URLSearchParams();

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10 md:py-12">
        <header className="page-copy-enter space-y-4">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            Question Catalog
          </Badge>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            Practice with focused interview questions
          </h1>
          <p className="max-w-4xl text-base leading-8 text-muted-foreground md:text-lg">
            Open any question to read a complete interview-style answer with
            code where relevant.
          </p>
        </header>

        <Separator className="my-6" />

        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Showing {pagination.start}-{pagination.end} of {pagination.total}{" "}
            question{pagination.total === 1 ? "" : "s"}
          </p>
          {pagination.total === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card/70 p-6">
              <p className="text-muted-foreground">
                No questions are available yet.
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {pagination.items.map((question, index) => (
                  <li key={question.id} className="block">
                    <QuestionCard
                      question={question}
                      staggerIndex={index}
                      showProgress={true}
                      layout="list"
                      progressState={
                        statesByQuestionId[question.id] ?? "unread"
                      }
                      isAuthenticated={isAuthenticated}
                    />
                  </li>
                ))}
              </ul>

              {pagination.totalPages > 1 ? (
                <nav
                  aria-label="Questions pagination"
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
