import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  isQuestionDifficulty,
  listQuestionFilterOptions,
  listQuestions,
  type QuestionDifficulty,
} from "@/lib/interview/questions";

type SearchParams = Promise<{
  category?: string | string[];
  difficulty?: string | string[];
  search?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getHref(
  current: URLSearchParams,
  updates: { category?: string | null; difficulty?: string | null },
) {
  const next = new URLSearchParams(current.toString());

  if (updates.category === null) {
    next.delete("category");
  } else if (updates.category !== undefined) {
    next.set("category", updates.category);
  }

  if (updates.difficulty === null) {
    next.delete("difficulty");
  } else if (updates.difficulty !== undefined) {
    next.set("difficulty", updates.difficulty);
  }

  const queryString = next.toString();
  return queryString ? `/questions?${queryString}` : "/questions";
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawParams = await searchParams;

  const selectedCategory = getSingleValue(rawParams.category)?.toLowerCase();
  const rawDifficulty = getSingleValue(rawParams.difficulty);
  const selectedDifficulty: QuestionDifficulty | undefined =
    isQuestionDifficulty(rawDifficulty) ? rawDifficulty : undefined;
  const search = getSingleValue(rawParams.search)?.trim() ?? "";

  const { categories, difficulties } = listQuestionFilterOptions();

  const questions = listQuestions({
    category: selectedCategory,
    difficulty: selectedDifficulty,
    search,
  });

  const currentQuery = new URLSearchParams();
  if (selectedCategory) currentQuery.set("category", selectedCategory);
  if (selectedDifficulty) currentQuery.set("difficulty", selectedDifficulty);
  if (search) currentQuery.set("search", search);

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <header className="space-y-4">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            Question Catalog
          </Badge>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            Practice with focused interview questions
          </h1>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
            Filter by category and difficulty, then open any question to read a
            complete interview-style answer with code where relevant.
          </p>
        </header>

        <Separator className="my-8" />

        <section className="space-y-6">
          <form className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/70 p-4 md:flex-row md:items-center">
            <label htmlFor="search" className="text-sm font-medium">
              Search
            </label>
            <input
              id="search"
              name="search"
              defaultValue={search}
              placeholder="e.g. event loop, caching, SQL"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring md:max-w-md"
            />
            {selectedCategory ? (
              <input type="hidden" name="category" value={selectedCategory} />
            ) : null}
            {selectedDifficulty ? (
              <input
                type="hidden"
                name="difficulty"
                value={selectedDifficulty}
              />
            ) : null}
            <Button type="submit" size="sm" className="md:ml-auto">
              Apply
            </Button>
          </form>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Categories
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                size="sm"
                variant={selectedCategory ? "outline" : "default"}
              >
                <Link
                  href={getHref(currentQuery, { category: null })}
                  scroll={false}
                >
                  All categories
                </Link>
              </Button>
              {categories.map((category) => {
                const active = selectedCategory === category.value;
                return (
                  <Button
                    key={category.value}
                    asChild
                    size="sm"
                    variant={active ? "default" : "outline"}
                  >
                    <Link
                      href={getHref(currentQuery, { category: category.value })}
                      scroll={false}
                    >
                      {category.label} ({category.count})
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Difficulty
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                size="sm"
                variant={selectedDifficulty ? "outline" : "default"}
              >
                <Link
                  href={getHref(currentQuery, { difficulty: null })}
                  scroll={false}
                >
                  All levels
                </Link>
              </Button>
              {difficulties.map((difficulty) => {
                const active = selectedDifficulty === difficulty.value;
                return (
                  <Button
                    key={difficulty.value}
                    asChild
                    size="sm"
                    variant={active ? "default" : "outline"}
                  >
                    <Link
                      href={getHref(currentQuery, {
                        difficulty: difficulty.value,
                      })}
                      scroll={false}
                    >
                      {difficulty.label} ({difficulty.count})
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        </section>

        <Separator className="my-8" />

        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Showing {questions.length} question
            {questions.length === 1 ? "" : "s"}
          </p>
          {questions.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card/70 p-6">
              <p className="text-muted-foreground">
                No questions match the current filters. Try clearing one filter
                or broadening your search.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {questions.map((question) => (
                <li
                  key={question.id}
                  className="rounded-xl border border-border/80 bg-card/70 p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{question.category}</Badge>
                    <Badge variant="secondary">
                      {question.difficulty.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ~{question.estimatedMinutes} min answer
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl leading-tight">
                    <Link
                      href={`/questions/${question.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {question.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-base leading-7 text-muted-foreground">
                    {question.summary}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
