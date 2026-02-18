import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listPlaylistDashboardItems } from "@/lib/interview/playlists";

export const dynamic = "force-dynamic";

function emptyStateCards() {
  return [
    {
      id: "empty-role",
      slug: "",
      title: "Role-based sprint",
      playlistType: "role",
      accessLevel: "free",
      totalItems: 0,
      estimatedMinutes: 0,
      nextUp:
        "No published playlists yet. Admins can create and publish playlists.",
      itemsRead: 0,
      completionPercent: 0,
    },
    {
      id: "empty-company",
      slug: "",
      title: "Company loop",
      playlistType: "company",
      accessLevel: "preview",
      totalItems: 0,
      estimatedMinutes: 0,
      nextUp:
        "No published playlists yet. Admins can create and publish playlists.",
      itemsRead: 0,
      completionPercent: 0,
    },
  ] as const;
}

function PlaylistCard({
  playlist,
}: {
  playlist: {
    id: string;
    slug: string;
    title: string;
    playlistType: string;
    accessLevel: string;
    itemsRead: number;
    totalItems: number;
    completionPercent: number;
    nextUp: string;
    estimatedMinutes: number;
  };
}) {
  const cardBody = (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge variant="outline" className="capitalize">
          {playlist.playlistType}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {playlist.accessLevel}
        </Badge>
      </div>

      <h3 className="font-serif text-lg leading-snug">{playlist.title}</h3>

      <p className="mt-2 text-sm text-muted-foreground">
        {playlist.itemsRead}/{playlist.totalItems} completed |{" "}
        {playlist.completionPercent}%
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground/80"
          style={{ width: `${playlist.completionPercent}%` }}
        />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-2">
          <dt className="text-muted-foreground">Next up</dt>
          <dd className="max-w-[64%] text-right font-medium leading-5">
            {playlist.nextUp}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-2">
          <dt className="text-muted-foreground">Estimated time</dt>
          <dd className="font-medium">~{playlist.estimatedMinutes} mins</dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-2">
          <dt className="text-muted-foreground">Total items</dt>
          <dd className="font-medium">{playlist.totalItems}</dd>
        </div>
      </dl>
    </>
  );

  if (!playlist.slug) {
    return (
      <div className="h-full rounded-2xl border border-border/70 bg-card/70 p-5 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
        {cardBody}
      </div>
    );
  }

  return (
    <Link
      href={`/playlists/${playlist.slug}`}
      className="group block h-full rounded-2xl border border-border/70 bg-card/70 p-5 shadow-[0_1px_0_0_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {cardBody}
      <p className="mt-4 text-sm font-medium text-foreground/80 group-hover:underline">
        Open playlist
      </p>
    </Link>
  );
}

export default async function PlaylistsDashboardConceptPage() {
  const playlistCards = await listPlaylistDashboardItems();
  const cards = playlistCards.length ? playlistCards : emptyStateCards();

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl space-y-8 px-6 py-12 md:px-10 md:py-16">
        <header className="space-y-4">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Playlists
          </Badge>
          <h1 className="max-w-4xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            Continue where you left off
          </h1>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
            Built from published playlists created by admins, with personal
            progress when you&apos;re signed in.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/questions">Browse questions</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/topics">Browse topics</Link>
            </Button>
          </div>
        </header>

        <Separator className="bg-border/60" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">Your playlists</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {cards.map((playlist) => (
              <li key={playlist.id}>
                <PlaylistCard playlist={playlist} />
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
