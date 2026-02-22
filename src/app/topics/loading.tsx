import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <div className="mx-auto w-full max-w-7xl px-6 py-6 md:px-10 md:py-8 animate-in fade-in duration-300">
        <header className="page-copy-enter space-y-3">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            Topic Catalog
          </Badge>
          <div className="h-10 sm:h-12 w-3/4 max-w-lg bg-border/60 rounded-md animate-pulse"></div>
          <div className="space-y-2 mt-2">
            <div className="h-5 w-full max-w-2xl bg-border/40 rounded animate-pulse"></div>
            <div className="h-5 w-5/6 max-w-xl bg-border/40 rounded animate-pulse"></div>
          </div>
        </header>

        <Separator className="my-6 border-border/80" />

        <section className="pt-2">
          <div className="h-4 w-40 bg-border/40 rounded animate-pulse mb-5"></div>

          <ul className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <li key={index} className="block">
                <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm min-h-[140px] relative">
                  {/* Subtle Shimmer Overlay */}
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent"></div>

                  <div className="space-y-3 relative z-10">
                    <div className="h-6 w-3/4 bg-border/80 rounded-md animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-border/50 rounded animate-pulse"></div>
                      <div className="h-4 w-4/5 bg-border/50 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between relative z-10">
                    <div className="h-5 w-24 bg-border/60 rounded-full animate-pulse"></div>
                    <div className="h-5 w-5 bg-border/40 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
