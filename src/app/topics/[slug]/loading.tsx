import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <article className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14 animate-in fade-in duration-300">
        <div className="mx-auto w-full max-w-[95ch]">
          {/* Back button skeleton */}
          <div className="mb-5 h-8 w-24 bg-border/40 rounded animate-pulse"></div>

          <header className="page-copy-enter space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Badge skeleton */}
              <div className="h-6 w-32 bg-border/40 rounded-full animate-pulse"></div>
            </div>
            {/* Title skeleton */}
            <div className="h-10 sm:h-12 w-3/4 max-w-2xl bg-border/60 rounded-md animate-pulse"></div>
            {/* Description skeleton */}
            <div className="space-y-2 mt-4">
              <div className="h-5 w-full bg-border/40 rounded animate-pulse"></div>
              <div className="h-5 w-5/6 bg-border/40 rounded animate-pulse"></div>
            </div>
          </header>

          <Separator className="my-7 border-border/80" />

          {/* Markdown Content Skeleton */}
          <div className="space-y-6 pt-2">
            <div className="space-y-3">
              <div className="h-4 w-full bg-border/40 rounded animate-pulse"></div>
              <div className="h-4 w-[95%] bg-border/40 rounded animate-pulse"></div>
              <div className="h-4 w-[90%] bg-border/40 rounded animate-pulse"></div>
              <div className="h-4 w-[80%] bg-border/40 rounded animate-pulse"></div>
            </div>
            <div className="space-y-3 mt-6">
              <div className="h-6 w-48 bg-border/60 rounded animate-pulse mb-4"></div>
              <div className="h-4 w-[85%] bg-border/40 rounded animate-pulse"></div>
              <div className="h-4 w-[90%] bg-border/40 rounded animate-pulse"></div>
              <div className="h-4 w-[75%] bg-border/40 rounded animate-pulse"></div>
            </div>
          </div>

          <Separator className="my-8 border-border/80" />

          {/* Related Questions Skeleton */}
          <section className="space-y-4">
            <div className="h-8 w-48 bg-border/80 rounded-md animate-pulse"></div>
            <div className="flex gap-4 overflow-hidden mt-4 relative">
              <div className="absolute inset-0 z-10 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent"></div>
              <div className="h-40 w-[280px] shrink-0 bg-border/30 rounded-xl border border-border animate-pulse relative overflow-hidden"></div>
              <div className="h-40 w-[280px] shrink-0 bg-border/30 rounded-xl border border-border animate-pulse hidden sm:block relative overflow-hidden"></div>
              <div className="h-40 w-[280px] shrink-0 bg-border/30 rounded-xl border border-border animate-pulse hidden md:block relative overflow-hidden"></div>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
