import { Menu } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TopbarSample = {
  id: "1" | "2" | "3";
  name: string;
  summary: string;
  barClassName: string;
  brandClassName: string;
  logoClassName: string;
  navClassName: string;
};

const SAMPLES: TopbarSample[] = [
  {
    id: "1",
    name: "Clean Balanced",
    summary: "Lighter heading weight with tight rhythm. Good default.",
    barClassName: "px-4 py-2.5",
    brandClassName:
      "font-sans text-[1.35rem] font-semibold leading-[1.08] tracking-[-0.015em]",
    logoClassName: "size-10",
    navClassName: "text-[0.92rem] font-medium",
  },
  {
    id: "2",
    name: "Soft Editorial",
    summary: "Softer typography and more breathing room.",
    barClassName: "px-4 py-3",
    brandClassName:
      "font-sans text-[1.3rem] font-medium leading-[1.12] tracking-[-0.01em]",
    logoClassName: "size-9",
    navClassName: "text-[0.88rem] font-normal",
  },
  {
    id: "3",
    name: "Compact Product",
    summary: "Dense, compact bar with utility-first navigation.",
    barClassName: "px-4 py-2",
    brandClassName:
      "font-sans text-[1.22rem] font-medium leading-[1.04] tracking-[-0.01em]",
    logoClassName: "size-9",
    navClassName: "text-[0.82rem] font-medium tracking-[0.04em] uppercase",
  },
];

function TopbarPreview({ sample }: { sample: TopbarSample }) {
  return (
    <article className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="font-serif text-xl tracking-tight">
          {sample.id}. {sample.name}
        </h2>
        <p className="text-sm text-muted-foreground">{sample.summary}</p>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Mobile Preview
          </p>
          <div className="w-full max-w-[390px] overflow-hidden rounded-xl border border-border/70 bg-background">
            <div
              className={cn(
                "flex items-center justify-between",
                sample.barClassName,
              )}
            >
              <div
                className={cn("flex items-center gap-2", sample.brandClassName)}
              >
                <BrandLogo
                  className={cn(
                    sample.logoClassName,
                    "shrink-0 text-foreground/80",
                  )}
                />
                <span className="whitespace-nowrap">Interview Prep</span>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Menu">
                <Menu className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Desktop Preview
          </p>
          <div className="overflow-hidden rounded-xl border border-border/70 bg-background">
            <div
              className={cn(
                "flex items-center justify-between",
                sample.barClassName,
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2.5",
                  sample.brandClassName,
                )}
              >
                <BrandLogo
                  className={cn(
                    sample.logoClassName,
                    "shrink-0 text-foreground/80",
                  )}
                />
                <span className="whitespace-nowrap">Interview Prep</span>
              </div>
              <div
                className={cn("flex items-center gap-4", sample.navClassName)}
              >
                <span>Topics</span>
                <span>Questions</span>
                <span>Playlists</span>
                <span>Admin</span>
                <span className="inline-flex size-7 items-center justify-center rounded-full border border-border/70 bg-foreground text-[10px] font-semibold text-background">
                  S
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function TopbarDesignSamplesPage() {
  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10 md:px-10 md:py-12">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Design Samples
          </p>
          <h1 className="font-serif text-4xl tracking-tight">
            Top Bar Variants
          </h1>
          <p className="text-sm text-muted-foreground">
            Review these three typography options and send the number you want
            me to apply in `src/app/layout.tsx`.
          </p>
        </header>

        <div className="grid gap-5">
          {SAMPLES.map((sample) => (
            <TopbarPreview key={sample.id} sample={sample} />
          ))}
        </div>
      </section>
    </main>
  );
}
