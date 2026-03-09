import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { PlaylistCard } from "@/components/playlist-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  listPlaylistDashboardItems,
  type PlaylistDashboardItem,
} from "@/lib/interview/playlists";
import { paginateItems, parsePositiveInt } from "@/lib/pagination";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PickerQuestion } from "./picker-question";
import { CreatePlaylistModal } from "./create-playlist-modal";
import { SortDropdown, type SortOption } from "@/components/sort-dropdown";

export const dynamic = "force-dynamic";
const PLAYLISTS_PAGE_SIZE = 9;

const SORT_OPTIONS: SortOption[] = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Recently Modified", value: "recently-modified" },
  { label: "Alphabetical", value: "alphabetical" },
];

/** Lightweight query: published questions with their first topic name. */
async function fetchPickerQuestions(): Promise<PickerQuestion[]> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      `
      id,
      title,
      question_topics(
        sort_order,
        topics(
          name
        )
      )
    `,
    )
    .eq("status", "published")
    .order("title", { ascending: true });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => {
    // Extract first topic name from the nested relation
    let topicName = "General";
    const qt = row.question_topics as Array<{
      topics: { name: string } | { name: string }[] | null;
    }> | null;
    if (qt && qt.length > 0) {
      const topicRel = qt[0]?.topics;
      if (topicRel) {
        if (Array.isArray(topicRel)) {
          topicName = topicRel[0]?.name ?? "General";
        } else {
          topicName = topicRel.name ?? "General";
        }
      }
    }

    return {
      id: row.id as string,
      title: row.title as string,
      topic: topicName,
    };
  });
}

function emptyStateCards(): PlaylistDashboardItem[] {
  return [
    {
      id: "empty-role",
      slug: "",
      title: "Role-based sprint",
      description:
        "No published playlists yet. Admins can create and publish playlists.",
      isSystem: true,
      tag: "role",
      accessLevel: "free",
      totalItems: 0,
      uniqueTopicCount: 0,
      estimatedMinutes: 10,
      nextUp: "Continue from the next question",
      itemsRead: 0,
      completionPercent: 0,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: "empty-company",
      slug: "",
      title: "Company loop",
      description:
        "No published playlists yet. Admins can create and publish playlists.",
      isSystem: true,
      tag: "company",
      accessLevel: "preview",
      totalItems: 0,
      uniqueTopicCount: 0,
      estimatedMinutes: 10,
      nextUp: "Continue from the next question",
      itemsRead: 0,
      completionPercent: 0,
      createdAt: null,
      updatedAt: null,
    },
  ];
}

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
  return queryString ? `/playlists?${queryString}` : "/playlists";
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

type SearchParams = Promise<{
  page?: string | string[];
  sort?: string | string[];
}>;

export default async function PlaylistsDashboardConceptPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createSupabaseServerClient();
  const rawParams = await searchParams;
  const requestedPage = parsePositiveInt(getSingleValue(rawParams.page), 1);
  const sortOption = getSingleValue(rawParams.sort);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSignedIn = !!user;

  const [playlistCards, pickerQuestions] = await Promise.all([
    listPlaylistDashboardItems({ sort: sortOption }),
    fetchPickerQuestions(),
  ]);
  const cards = playlistCards.length ? playlistCards : emptyStateCards();
  const pagination = paginateItems(cards, requestedPage, PLAYLISTS_PAGE_SIZE);
  const visiblePages = getVisiblePages(pagination.page, pagination.totalPages);

  const currentQuery = new URLSearchParams();
  if (sortOption) {
    currentQuery.set("sort", sortOption);
  }

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-6 md:px-10 md:py-8">
        <header className="page-copy-enter space-y-3">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Playlists
          </Badge>
          <div className="flex items-center justify-between gap-3">
            <h1 className="max-w-4xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
              Curated Playlists
            </h1>
            <CreatePlaylistModal
              questions={pickerQuestions}
              isSignedIn={isSignedIn}
            />
          </div>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
            Hand-crafted collections of questions designed to help you master
            specific roles, companies, and technologies in depth.
          </p>
        </header>

        <Separator className="bg-border/60" />

        <div className="flex items-center justify-between pt-2 mb-5">
          <p className="text-sm text-muted-foreground">
            Showing {pagination.start}-{pagination.end} of {pagination.total}{" "}
            playlist{pagination.total === 1 ? "" : "s"}
          </p>
          {pagination.total > 1 && (
            <SortDropdown options={SORT_OPTIONS} defaultSort="newest" />
          )}
        </div>

        <section className="pt-2">
          <ul className="grid gap-4 md:grid-cols-3">
            {pagination.items.map((playlist, index) => (
              <li key={playlist.id}>
                <PlaylistCard
                  playlist={playlist}
                  variant="dashboard"
                  showProgress
                  staggerIndex={index}
                />
              </li>
            ))}
          </ul>

          {pagination.totalPages > 1 ? (
            <nav
              aria-label="Playlists pagination"
              className="flex flex-wrap items-center gap-2 pt-4"
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
        </section>
      </section>
    </main>
  );
}
