import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <article className="mx-auto w-full max-w-6xl px-6 pt-6 pb-8 md:px-10 md:pt-10 md:pb-12 animate-in fade-in duration-300">
        <div className="mx-auto w-full max-w-[95ch]">
          <header className="page-copy-enter space-y-3 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-20 bg-border/50 rounded-full animate-pulse"></div>
              <div className="h-5 w-16 bg-border/50 rounded-full animate-pulse"></div>
            </div>
            <div className="h-10 sm:h-12 w-full max-w-2xl bg-border/80 rounded-md animate-pulse"></div>
            <div className="space-y-2 mt-4">
              <div className="h-5 w-full bg-border/50 rounded animate-pulse"></div>
              <div className="h-5 w-4/5 bg-border/50 rounded animate-pulse"></div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <div className="h-4 w-24 bg-border/40 rounded animate-pulse"></div>
              <div className="h-4 w-16 bg-border/40 rounded animate-pulse"></div>
            </div>
          </header>

          <Separator className="my-5 border-border/80" />

          <div className="space-y-6 pt-2">
            <div className="space-y-3">
              <div className="h-4 w-full bg-border/50 rounded animate-pulse"></div>
              <div className="h-4 w-[95%] bg-border/50 rounded animate-pulse"></div>
              <div className="h-4 w-[90%] bg-border/50 rounded animate-pulse"></div>
              <div className="h-4 w-[80%] bg-border/50 rounded animate-pulse"></div>
            </div>

            {/* Code Block Skeleton */}
            <div className="h-32 sm:h-48 w-full bg-border/30 rounded-xl border border-border animate-pulse my-8 relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent"></div>
            </div>

            <div className="space-y-3 mt-8">
              <div className="h-6 w-48 bg-border/70 rounded animate-pulse mb-4"></div>
              <div className="h-4 w-[85%] bg-border/40 rounded animate-pulse"></div>
              <div className="h-4 w-[90%] bg-border/40 rounded animate-pulse"></div>
              <div className="h-4 w-[75%] bg-border/40 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
