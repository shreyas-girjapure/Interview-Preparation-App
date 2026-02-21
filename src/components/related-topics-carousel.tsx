import Link from "next/link";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { TopicCard, type TopicCardData } from "@/components/topic-card";

export function RelatedTopicsCarousel({ topics }: { topics: TopicCardData[] }) {
  if (!topics.length) {
    return null;
  }

  if (topics.length <= 3) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((topic) => (
          <TopicCard key={topic.slug} topic={topic} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <Carousel
        opts={{
          align: "start",
          dragFree: false,
        }}
        className="w-full"
      >
        <CarouselContent className="py-2">
          {topics.map((topic) => (
            <CarouselItem key={topic.slug} className="basis-[260px]">
              <TopicCard topic={topic} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          variant="ghost"
          className="left-2 z-20 h-9 w-9 rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm transition hover:bg-background disabled:opacity-30"
        />
        <CarouselNext
          variant="ghost"
          className="right-2 z-20 h-9 w-9 rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm transition hover:bg-background disabled:opacity-30"
        />
      </Carousel>
    </div>
  );
}
