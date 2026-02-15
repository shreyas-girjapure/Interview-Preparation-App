"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type RelatedTopicCard = {
  slug: string;
  name: string;
  shortDescription: string;
};

export function CarouselWithControls({
  topics,
}: {
  topics: RelatedTopicCard[];
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const total = topics.length;

  const syncState = useCallback(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

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
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(viewportCenter - cardCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveIndex(nearestIndex);
  }, []);

  useEffect(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    syncState();
    rail.addEventListener("scroll", syncState, { passive: true });
    window.addEventListener("resize", syncState);

    return () => {
      rail.removeEventListener("scroll", syncState);
      window.removeEventListener("resize", syncState);
    };
  }, [syncState]);

  const scrollToIndex = useCallback((index: number) => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const cards = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-topic-card]"),
    );
    const target = cards[index];

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  if (!total) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
        <p className="text-sm text-muted-foreground">
          No related topics available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Topic {activeIndex + 1} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full"
            disabled={!canPrev}
            aria-label="Previous topic"
            onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full"
            disabled={!canNext}
            aria-label="Next topic"
            onClick={() => scrollToIndex(Math.min(total - 1, activeIndex + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-[oklch(0.985_0.004_95)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-[oklch(0.985_0.004_95)] to-transparent" />

        <div
          ref={railRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Related topics carousel"
        >
          {topics.map((topic, index) => (
            <article
              key={topic.slug}
              data-topic-card
              className="min-w-[78%] snap-center rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm transition-colors hover:bg-card sm:min-w-[58%] md:min-w-[44%] lg:min-w-[32%]"
            >
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Related topic {index + 1}
              </p>
              <h3 className="mt-2 font-serif text-xl leading-tight">{topic.name}</h3>
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
