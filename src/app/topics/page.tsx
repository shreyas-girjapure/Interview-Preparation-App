import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listTopics } from "@/lib/interview/questions";

type SearchParams = Promise<{
  search?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawParams = await searchParams;
  const search = getSingleValue(rawParams.search)?.trim() ?? "";
  const topics = await listTopics({ search });

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
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
          <p className="max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
            Explore core interview concepts first. Each topic page links into
            relevant questions and adjacent concepts for rabbit-hole learning.
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
            Showing {topics.length} topic{topics.length === 1 ? "" : "s"}
          </p>

          {topics.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card/70 p-6">
              <p className="text-muted-foreground">
                No topics match this search. Try a broader term.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {topics.map((topic) => (
                <li
                  key={topic.slug}
                  className="rounded-xl border border-border/80 bg-card/70 p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant="outline">
                      {topic.questionCount} question
                      {topic.questionCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <h2 className="font-serif text-2xl leading-tight">
                    <Link
                      href={`/topics/${topic.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {topic.name}
                    </Link>
                  </h2>
                  <p className="mt-2 text-base leading-7 text-muted-foreground">
                    {topic.shortDescription}
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
