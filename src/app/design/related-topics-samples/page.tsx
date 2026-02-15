import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CarouselWithControls } from "@/app/design/related-topics-samples/carousel-with-controls";
import { CarouselEdgeArrows } from "@/app/design/related-topics-samples/carousel-edge-arrows";
import { ShadcnCarouselSample } from "@/app/design/related-topics-samples/shadcn-carousel-sample";
import { ShadcnWideCarouselSample } from "@/app/design/related-topics-samples/shadcn-wide-carousel-sample";

const SAMPLE_TOPICS = [
  {
    slug: "salesforce-lwc-lifecycle",
    name: "Salesforce LWC Lifecycle",
    shortDescription: "Lifecycle hooks and rerender behavior in LWC.",
  },
  {
    slug: "react-reconciliation",
    name: "React Reconciliation",
    shortDescription: "Diffing, keys, and render phases in React.",
  },
  {
    slug: "frontend-performance",
    name: "Frontend Performance",
    shortDescription: "Frame budgets, profiling, and bottleneck analysis.",
  },
  {
    slug: "async-javascript-patterns",
    name: "Async JavaScript Patterns",
    shortDescription: "Promises, async/await, and concurrency control.",
  },
  {
    slug: "typescript-generics",
    name: "TypeScript Generics",
    shortDescription: "Reusable, type-safe patterns with strong inference.",
  },
  {
    slug: "system-design-tradeoffs",
    name: "System Design Tradeoffs",
    shortDescription: "Latency, consistency, and scaling decisions.",
  },
  {
    slug: "mulesoft-error-handling",
    name: "MuleSoft Error Handling",
    shortDescription: "Retry strategy, propagation, and dead-letter flows.",
  },
  {
    slug: "flutter-render-pipeline",
    name: "Flutter Render Pipeline",
    shortDescription: "Build/layout/paint phases and jank mitigation.",
  },
  {
    slug: "dart-async-isolates",
    name: "Dart Async and Isolates",
    shortDescription: "CPU-bound offloading and message passing in Dart.",
  },
  {
    slug: "mulesoft-runtime-deployment",
    name: "MuleSoft Runtime Deployment",
    shortDescription: "Environment promotion and worker sizing patterns.",
  },
  {
    slug: "typescript-type-narrowing",
    name: "TypeScript Type Narrowing",
    shortDescription: "Control-flow narrowing and discriminated unions.",
  },
  {
    slug: "salesforce-integration-patterns",
    name: "Salesforce Integration Patterns",
    shortDescription: "Platform events, CDC, and idempotent integration.",
  },
];

const PREVIEW_LIMIT = 6;

export default function RelatedTopicsSamplesPage() {
  const previewTopics = SAMPLE_TOPICS.slice(0, PREVIEW_LIMIT);
  const hiddenCount = SAMPLE_TOPICS.length - PREVIEW_LIMIT;

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10 md:py-16">
        <header className="space-y-4">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            Design Samples
          </Badge>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            Related Topics layouts for 10+ items
          </h1>
          <p className="max-w-4xl text-base leading-8 text-muted-foreground md:text-lg">
            Same data, different layout patterns for question detail pages.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/design/related-questions-samples">
                Related questions samples
              </Link>
            </Button>
          </div>
        </header>

        <Separator className="my-8" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample A (Recommended): Top 6 cards + View all
          </h2>
          <p className="text-sm text-muted-foreground">
            Clean scan path. Keeps page compact while still exposing full list
            on demand.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {previewTopics.map((topic) => (
              <div
                key={`a-${topic.slug}`}
                className="rounded-2xl border border-border/80 bg-card/70 p-5"
              >
                <h3 className="font-serif text-xl leading-tight">{topic.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {topic.shortDescription}
                </p>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm">
            View all {SAMPLE_TOPICS.length} related topics
          </Button>
        </section>

        <Separator className="my-10" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample B: Chip list + +N more
          </h2>
          <p className="text-sm text-muted-foreground">
            Most compact option. Faster scanning, less context per topic.
          </p>
          <div className="flex flex-wrap gap-2">
            {previewTopics.map((topic) => (
              <Button key={`b-${topic.slug}`} variant="outline" size="sm">
                {topic.name}
              </Button>
            ))}
            {hiddenCount > 0 ? (
              <Button variant="secondary" size="sm">
                +{hiddenCount} more
              </Button>
            ) : null}
          </div>
        </section>

        <Separator className="my-10" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample C: Horizontal scroll rail
          </h2>
          <p className="text-sm text-muted-foreground">
            Gives every topic a card without vertical growth, but depends on
            swipe/scroll.
          </p>
          <div className="flex snap-x gap-4 overflow-x-auto pb-2">
            {SAMPLE_TOPICS.map((topic) => (
              <div
                key={`c-${topic.slug}`}
                className="min-w-[260px] snap-start rounded-2xl border border-border/80 bg-card/70 p-5"
              >
                <h3 className="font-serif text-xl leading-tight">{topic.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {topic.shortDescription}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Separator className="my-10" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample D: Subtle pro-style carousel (arrows + peek)
          </h2>
          <p className="text-sm text-muted-foreground">
            Card rail with peeking next items, subtle arrows, and snap behavior.
          </p>
          <CarouselWithControls topics={SAMPLE_TOPICS} />
        </section>

        <Separator className="my-10" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample E: Edge arrows (extreme left and right)
          </h2>
          <p className="text-sm text-muted-foreground">
            Same subtle rail, with arrows pinned to the outer edges for quick
            navigation.
          </p>
          <CarouselEdgeArrows topics={SAMPLE_TOPICS} />
        </section>

        <Separator className="my-10" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample F: shadcn carousel baseline
          </h2>
          <p className="text-sm text-muted-foreground">
            Standard shadcn carousel pattern with left/right controls and
            paged cards.
          </p>
          <div className="px-10">
            <ShadcnCarouselSample topics={SAMPLE_TOPICS} />
          </div>
        </section>

        <Separator className="my-10" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample G: D-wide cards + shadcn arrows
          </h2>
          <p className="text-sm text-muted-foreground">
            Wider card focus like D, but with shadcn carousel controls.
          </p>
          <ShadcnWideCarouselSample topics={SAMPLE_TOPICS} />
        </section>

        <Separator className="my-10" />

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/questions/salesforce-lwc-lifecycle-vs-react">
              Back to question example
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
