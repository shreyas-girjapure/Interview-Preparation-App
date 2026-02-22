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
            Question Catalog
          </Badge>
          <div className="h-10 sm:h-12 w-4/5 max-w-2xl bg-border/60 rounded-md animate-pulse"></div>
          <div className="h-5 w-3/4 max-w-xl bg-border/40 rounded animate-pulse mt-2"></div>
        </header>

        <Separator className="my-6 border-border/80" />

        <section className="pt-2">
          <div className="h-4 w-40 bg-border/40 rounded animate-pulse mb-5"></div>

          <ul className="space-y-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <li key={index} className="block">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center rounded-xl border border-border bg-card p-5 shadow-sm relative overflow-hidden">
                  {/* Subtle Shimmer Overlay */}
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent"></div>

                  <div className="space-y-3 w-full sm:w-2/3 relative z-10">
                    <div className="h-6 w-full max-w-md bg-border/80 rounded animate-pulse"></div>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-16 bg-border/50 rounded-full animate-pulse"></div>
                      <div className="h-5 w-20 bg-border/50 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-6 w-24 bg-border/60 rounded-full animate-pulse self-start sm:self-center relative z-10"></div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
