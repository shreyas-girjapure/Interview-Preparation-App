import Link from "next/link";
import { ArrowRight, AudioLines, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomeMocksPage() {
  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-5xl px-6 py-10 md:px-10 md:py-14">
        <header className="page-copy-enter space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Home Mocks</Badge>
            <Badge variant="secondary">UI Concepts</Badge>
          </div>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-6xl">
            Quick mock pages for feature feel.
          </h1>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
            These routes are isolated from the real product flow. They exist
            only to preview interface direction and interaction shape before the
            actual feature is wired up.
          </p>
        </header>

        <div className="mt-8 grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
          <article className="rounded-[2rem] border border-border/80 bg-card/80 p-6 shadow-sm md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AudioLines className="size-4" />
                  Immersive voice interview
                </div>
                <h2 className="mt-3 font-serif text-3xl tracking-tight">
                  Topic mock interview shell
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  A polished concept for the voice interview experience with a
                  live stage, transcript, scope briefing, session controls, and
                  post-session debrief preview.
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                Mock only
              </Badge>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/home-mocks/voice-interview">
                  Open Mock
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/topics">Back to real app</Link>
              </Button>
            </div>
          </article>

          <aside className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-[oklch(0.99_0.01_96)] via-card to-[oklch(0.95_0.015_85)] p-6 shadow-sm">
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
              <Sparkles className="size-5" />
            </div>
            <h2 className="mt-4 font-serif text-2xl tracking-tight">
              What this mock covers
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <li>Topic-scoped interview briefing</li>
              <li>Live stage and control tray</li>
              <li>Readable transcript during voice playback</li>
              <li>Recent-changes citation treatment</li>
              <li>End-of-session debrief summary</li>
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
