import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-6 md:px-10 md:py-8 animate-in fade-in duration-300">
        <header className="page-copy-enter space-y-3">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            Playlists
          </Badge>
          <div className="h-10 sm:h-12 w-2/3 max-w-sm bg-border/60 rounded-md animate-pulse"></div>
          <div className="space-y-2 mt-2">
            <div className="h-5 w-full max-w-xl bg-border/40 rounded animate-pulse"></div>
            <div className="h-5 w-5/6 max-w-lg bg-border/40 rounded animate-pulse"></div>
          </div>
        </header>

        <Separator className="border-border/80" />

        <section className="pt-2">
          <ul className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <li key={index}>
                <div className="flex h-full min-h-[180px] flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all sm:p-6 relative">
                  {/* Subtle Shimmer Overlay */}
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent"></div>

                  <div className="mb-4 flex items-center gap-2 relative z-10">
                    <div className="h-5 w-20 bg-border/60 rounded-full animate-pulse"></div>
                  </div>
                  <div className="mb-2 h-6 w-3/4 bg-border/80 rounded animate-pulse relative z-10"></div>
                  <div className="space-y-2 mb-4 relative z-10">
                    <div className="h-4 w-full bg-border/50 rounded animate-pulse"></div>
                    <div className="h-4 w-5/6 bg-border/50 rounded animate-pulse"></div>
                  </div>
                  <div className="mt-auto pt-4 space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 bg-border/50 rounded animate-pulse"></div>
                      <div className="h-4 w-8 bg-border/40 rounded animate-pulse"></div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                      <div className="h-full w-1/3 bg-border/80 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
