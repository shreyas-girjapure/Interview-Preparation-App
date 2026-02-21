import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlaylistCard } from "@/components/playlist-card";
import { Separator } from "@/components/ui/separator";
import { listPlaylistDashboardItems } from "@/lib/interview/playlists";

export const dynamic = "force-dynamic";

function emptyStateCards() {
  return [
    {
      id: "empty-role",
      slug: "",
      title: "Role-based sprint",
      description:
        "No published playlists yet. Admins can create and publish playlists.",
      playlistType: "role",
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
      playlistType: "company",
      accessLevel: "preview",
      totalItems: 0,
      uniqueTopicCount: 0,
      itemsRead: 0,
      completionPercent: 0,
    },
  ] as const;
}

export default async function PlaylistsDashboardConceptPage() {
  const playlistCards = await listPlaylistDashboardItems();
  const cards = playlistCards.length ? playlistCards : emptyStateCards();

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10 md:px-10 md:py-12">
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
                <PlaylistCard
                  playlist={playlist}
                  variant="dashboard"
                  showProgress
                />
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
