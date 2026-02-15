"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type RelatedTopicCard = {
  slug: string;
  name: string;
  shortDescription: string;
};

export function CarouselEdgeArrows({
  topics,
}: {
  topics: RelatedTopicCard[];
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    setCanPrev(rail.scrollLeft > 2);
    setCanNext(rail.scrollLeft < maxScrollLeft - 2);

    const cards = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-topic-card]"),
    );
    if (!cards.length) {
      setActiveIndex(0);
      return;
    }

    const viewportCenter = rail.scrollLeft + rail.clientWidth / 2;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const center = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(center - viewportCenter);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    setActiveIndex(bestIndex);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    syncState();
    rail.addEventListener("scroll", syncState, { passive: true });
    window.addEventListener("resize", syncState);

    return () => {
      rail.removeEventListener("scroll", syncState);
      window.removeEventListener("resize", syncState);
    };
  }, [syncState]);

  const scrollToIndex = useCallback((nextIndex: number) => {
    const rail = railRef.current;
    if (!rail) return;

    const cards = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-topic-card]"),
    );
    const target = cards[nextIndex];
    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  if (!topics.length) {
    return null;
  }

  return (
    <div className="relative rounded-2xl border border-border/80 bg-card/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Topic {activeIndex + 1} of {topics.length}
        </p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-[oklch(0.985_0.004_95)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-[oklch(0.985_0.004_95)] to-transparent" />

        <button
          type="button"
          aria-label="Previous topic"
          disabled={!canPrev}
          onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
          className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/80 bg-background/90 p-2 text-foreground shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-label="Next topic"
          disabled={!canNext}
          onClick={() =>
            scrollToIndex(Math.min(topics.length - 1, activeIndex + 1))
          }
          className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/80 bg-background/90 p-2 text-foreground shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div
          ref={railRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-8 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Related topics carousel edge arrows"
        >
          {topics.map((topic) => (
            <article
              key={topic.slug}
              data-topic-card
              className="min-w-[80%] snap-center rounded-2xl border border-border/80 bg-background/80 p-5 sm:min-w-[62%] md:min-w-[46%] lg:min-w-[34%]"
            >
              <h3 className="font-serif text-xl leading-tight">{topic.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {topic.shortDescription}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
