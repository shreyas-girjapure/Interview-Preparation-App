import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getPlaylistBySlug } from "@/lib/interview/playlists";

export const dynamic = "force-dynamic";

type Params = Promise<{
  slug: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const playlist = await getPlaylistBySlug(slug);

  if (!playlist) {
    return {
      title: "Playlist not found",
    };
  }

  return {
    title: `${playlist.title} | Playlists | Interview Prep`,
    description: playlist.description,
  };
}

export default async function PlaylistDetailsPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const playlist = await getPlaylistBySlug(slug);

  if (!playlist) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <article className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto w-full max-w-[95ch]">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-5 h-auto px-0"
          >
            <Link href="/playlists">Back to playlists</Link>
          </Button>

          <header className="page-copy-enter space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {playlist.playlistType}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {playlist.accessLevel}
              </Badge>
              <Badge variant="outline">
                {playlist.completionPercent}% completed
              </Badge>
            </div>
            <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
              {playlist.title}
            </h1>
            <p className="text-base leading-8 text-foreground/70 md:text-lg">
              {playlist.description}
            </p>
          </header>

          <Separator className="my-7 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both delay-[420ms]" />

          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both delay-[520ms]">
            <h2 className="font-serif text-2xl tracking-tight">
              Questions in this playlist
            </h2>
            {playlist.questions.length === 0 ? (
              <div className="rounded-xl border border-border/80 bg-card/70 p-4">
                <p className="text-sm text-muted-foreground">
                  This playlist has no linked questions yet.
                </p>
              </div>
            ) : (
              <ol className="space-y-3">
                {playlist.questions.map((question, index) => (
                  <li
                    key={question.id}
                    className="rounded-xl border border-border/80 bg-card/70 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                    <h3 className="font-serif text-xl leading-tight">
                      <Link
                        href={`/questions/${question.slug}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {question.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {question.summary}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </article>
    </main>
  );
}
