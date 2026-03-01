import { Badge } from "@/components/ui/badge";
import { PlaylistCard } from "@/components/playlist-card";
import { Separator } from "@/components/ui/separator";
import { listPlaylistDashboardItems } from "@/lib/interview/playlists";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CreatePlaylistModal,
  type PickerQuestion,
} from "./create-playlist-modal";
import { SortDropdown, type SortOption } from "@/components/sort-dropdown";

export const dynamic = "force-dynamic";

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

function emptyStateCards() {
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
      itemsRead: 0,
      completionPercent: 0,
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
      itemsRead: 0,
      completionPercent: 0,
    },
  ] as const;
}

type SearchParams = Promise<{
  sort?: string | string[];
}>;

export default async function PlaylistsDashboardConceptPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createSupabaseServerClient();
  const rawParams = await searchParams;
  const sortOption = Array.isArray(rawParams.sort)
    ? rawParams.sort[0]
    : rawParams.sort;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSignedIn = !!user;

  const [playlistCards, pickerQuestions] = await Promise.all([
    listPlaylistDashboardItems({ sort: sortOption }),
    fetchPickerQuestions(),
  ]);
  const cards = playlistCards.length ? playlistCards : emptyStateCards();

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

        <div className="flex items-center justify-end pt-2">
          {cards.length > 1 && (
            <SortDropdown options={SORT_OPTIONS} defaultSort="newest" />
          )}
        </div>

        <section className="pt-2">
          <ul className="grid gap-4 md:grid-cols-3">
            {cards.map((playlist, index) => (
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
        </section>
      </section>
    </main>
  );
}
